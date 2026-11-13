---
title: DeepSeek Harness 灰度机制解析及绕过
description: 这篇文章介绍了 DeepSeek Harness 官方版本的灰度更新检测机制，以及绕过机制直接获取最新版的教程
pubDate: '2026-11-13T10:57:51.273Z'
category: ''
tags: [逆向, 教程]
---

## 0. TL; DR

DeepSeek Harness 的更新机制简单来说就是：服务端在 `nightly.yml` 里写一个 `stagingPercentage`，客户端用 `%APPDATA%\@deepseek-ai\dsh-desktop\.updaterId` 里保存的 UUID，取**最后四个字节（最后八位）**当 `uint32`，除以 `0xffffffff` 得到一个在 0 到 1 之间的数，只有这个数小于 `stagingPercentage / 100` 时才认为检查到更新，然后去拉取。

因此，直接去把这个文件的末八位改成小于等于 `0x19999999` 的值（例如 `00000000`）就行

## 1. 逻辑分析

### 1.1 安装目录与配置

先去看看 DeepSeek Harness 桌面版的更新通道，打开 `%USERPROFILE%\AppData\Local\Programs\DeepSeek Harness\resources\app-update.yml`，能看到：

```yaml
provider: generic
url: https://download.deepseek.com/dsh-desk/feeds/win-x64/
channel: nightly
updaterCacheDirName: '@deepseek-aidsh-desktop-updater'
...
```

从 `channel: nightly` 可以看出 electron-updater 请求的是 **`nightly.yml`**，走的是 nightly 通道（其实 `stable.yml` 根本就是 404 的，毕竟 Harness 还在公测）

### 1.2 服务端 feed

```yaml
version: "0.2.2-rc.3"
stagingPercentage: 10
releaseDate: "2026-11-13T07:31:42.937Z"
...
```

`stagingPercentage` 是一个在 0 到 100 之间的整数，是每个版本独立的，跟请求 IP 或者客户端特征没关系，估计官方就是通过修改这个值进行灰度更新，调整灰度范围的。

### 1.3 客户端请求路径

```
at autoUpdater.checkForUpdates()
at doCheckForUpdates()
at getUpdateInfoAndProvider()      → 请求 nightly.yml 并解析
at isUpdateAvailable(updateInfo)
at semver 解析 / 相等判断
at isUpdateSupported()           ← minimumSystemVersion（估计是检查系统版本）
at isUserWithinRollout()         ← 灰度范围检测
at semver.gt(latest, current)    → 进行版本号比较
```

## 2. 判定逻辑

DeepSeek Harness 使用的灰度逻辑是来自 electron-updater 的默认逻辑，因此直接去翻了[源代码](https://github.com/electron-userland/electron-builder/blob/electron-updater@6.8.9/packages/electron-updater/src/AppUpdater.ts)：

```typescript
private async isStagingMatch(updateInfo: UpdateInfo): Promise<boolean> {
  const rawStagingPercentage = updateInfo.stagingPercentage
  let stagingPercentage = rawStagingPercentage
  if (stagingPercentage == null) {
    return true
  }

  stagingPercentage = parseInt(stagingPercentage as any, 10)
  if (isNaN(stagingPercentage)) {
    this._logger.warn(`Staging percentage is NaN: ${rawStagingPercentage}`)
    return true
  }

  // convert from user 0-100 to internal 0-1
  stagingPercentage = stagingPercentage / 100

  const stagingUserId = await this.stagingUserIdPromise.value
  const val = UUID.parse(stagingUserId).readUInt32BE(12)
  const percentage = val / 0xffffffff
  this._logger.info(`Staging percentage: ${stagingPercentage}, percentage: ${percentage}, user id: ${stagingUserId}`)
  return percentage < stagingPercentage
}
```

以及 ID 的来源（嗯对也是 electron-updater 的逻辑）

```typescript
private async getOrCreateStagingUserId(): Promise<string> {
  const file = path.join(this.app.userDataPath, ".updaterId")
  try {
    const id = await readFile(file, "utf-8")
    if (UUID.check(id)) {
      return id
    } else {
      this._logger.warn(`Staging user id file exists, but content was invalid: ${id}`)
    }
  } catch (e: any) {
    if (e.code !== "ENOENT") {
      this._logger.warn(`Couldn't read staging user ID, creating a blank one: ${e}`)
    }
  }
  
  const id = UUID.v5(randomBytes(4096), UUID.OID)
  this._logger.info(`Generated new staging user ID: ${id}`)
  try {
    await outputFile(file, id)
  } catch (e: any) {
    this._logger.warn(`Couldn't write out staging user ID: ${e}`)
  }
  return id
}
```

简单来说，根据官方 yaml 里填写的数值，本机的 electron-updater 会根据一个通常情况下不会变动的 ID，来判断自身是否处于灰度范围内。如果在就会提示有更新。

值得注意的是，这段逻辑 DeepSeek 官方完全没有复写，用的就是 electron-updater 的原逻辑

这意味着，如果官方之后发布了新的灰度测试版本，先拿到的永远是先拿到，后拿到的永远是后拿到。除非去改 ID，否则这个顺序是不会变动的。

## 3. 绕过判定

其实绕过判定很简单，只需要去把 `%APPDATA%\@deepseek-ai\dsh-desktop\.updaterId` 这个文件里的值改了就行。

打开这个文件，你会看到一个随机生成的 UUIDv5 字符串，只需要把末 8 位修改一下，小于等于 `0x19999999`，在前面提到的逻辑中计算出来的值就会小于 10%，这样通常情况下你就能较早地拿到灰度版本。

当然，如果官方之后出的灰度版本把数值调得更小，例如 5%，那么你仍然无法拿到灰度版本，此时更建议你把末八位数值改成 `00000000`（注意不要换行），改完重启 Harness 就好。

## 4. 一个 Bug？一个特性？啊其实就是底层代码

前面提到，目前的 DeepSeek Harness 是没有 `stable.yml` 的，只有 `nightly.yml`，这意味着，如果一个用户（比如我）电脑上安装的是 0.2.2-rc.1 版本，并且他错过了 rc.2 版本的更新期间，官方把 `nightly.yml` 改成了 rc.3，此时再打开 DeepSeek harness 检查更新，就只能获取到 rc.3 版本。

但此时你既不在灰度内，又已经无法在程序内获取到 rc.2 的 release，就只会停在 rc.1 无法更新。如果 rc.1 有一些紧急 bug 需要更新到 rc.2，那错过了 rc.2 就只能等到 rc.3 下放给你了才能得到修复。

不过官方的下载那边确实还会留着 rc.2 的安装包，手动下载安装一下也没问题，但是如果用户不知道这事儿就难说了