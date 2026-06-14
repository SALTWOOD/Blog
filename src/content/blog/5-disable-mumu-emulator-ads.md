---
title: '如何关闭 MuMu 模拟器弹窗广告'
description: ''
pubDate: 2025-02-21T13:45:48.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/5.webp'
tags: [安卓, 模拟器, 去广告]
category: ''
---

## 0. 起因

MuMu 模拟器我一直在用，可以说整体上*除了有些广告之外*很不错。

一天，我后台挂着模拟器，突然电脑右下角来个弹窗。此前 MuMu 模拟器**并没有电脑桌面的弹窗广告**，估计是某个版本更新之后加的。

模拟器桌面的弹窗广告经常不小心点到然后自动安装、消息中心小红点都忍了，但是电脑桌面弹窗真的不能忍。于是简单总结一下怎么干掉这些广告。

## 1. 屏蔽内部桌面广告

桌面广告内置于一个包名为 `com.mumu.launcher_new` 的系统软件中。这个软件同时也是模拟器桌面，因此显然不能通过直接删除这个软件的方式来关闭广告。

1. 下载旧版本桌面：[此处](https://ski.ink/static/files/com.mumu.launcher_new.apk)或[备用蓝奏云链接](https://wwre.lanzouq.com/ibbgZ27aapkf)（密码 2mrs，来自 [MuMu12 开屏广告与桌面广告的简单解决办法](https://www.bilibili.com/opus/830791956620640309)）
2. 进入模拟器设置 → 磁盘 → 启用**可写系统盘**
3. 通过 ADB 或内置文件管理器找到 `/system/priv-app/com.mumu.launcher_new/com.mumu.launcher_new.apk`
4. 将下载下来的旧版本桌面软件 APK 重命名为 `com.mumu.launcher_new.apk`，然后替换，如图。

![](https://static.ski.ink/blog-uploads/5/images/1.webp)

### 1.2 替换文件后的异常处理

替换完成后，**几乎百分百**会出现如图所示的提示。

[![](https://static.ski.ink/blog-uploads/5/images/2.webp)](https://static.ski.ink/blog-uploads/5/images/2.webp)

这个问题也很好解决，点击**应用信息** → **存储**，然后清除 **Mumu Launcher** 的数据就好了。

如果清除之后还是出现弹窗，就清除**游戏中心**的数据，然后**再清除一遍 Mumu Launcher 的数据**。

## 2. 屏蔽桌面弹窗广告

通过火绒的截图拦截可以发现弹窗程序名叫 **MuMuPlayerService.exe**，双击打开没有什么作用，删掉似乎也不影响使用。于是解决方案呼之欲出——

> 删除 MuMu 安装路径下的 **`MuMuPlayerService.exe`**，然后**新建同名文件夹替代**（**一定是文件夹**）。

## 3. 屏蔽开屏广告

这个其实还好，但是既然写了这文章也一并给出。

> 打开 **`%APPDATA%\Netease\MuMuPlayer-12.0\data`**，删掉一个名叫 **`startupImage`** 的**文件夹**，**新建一个同名文件**（**一定是文件**）。

这样做可以阻止 MuMu 模拟器联网下载开屏广告图，就不会显示开屏广告了。如果你想自定义开屏图片也可以尝试修改这里头的文件，只是这篇文章不作记述。

## 4. 屏蔽消息中心

通过流量分析可得知，提供消息中心通知推送服务的域名是 **mumu.nie.netease.com**。于是只需要在 Hosts 中屏蔽这个域名就好了。

1. 按 **Ctrl + Shift + Esc** 打开任务管理器
2. 选择**运行新任务**，勾选下方的"**以系统管理权限创建此任务**"
3. 在输入框输入 `notepad C:\Windows\System32\drivers\etc\hosts`，按确定
4. 找一个空闲的地方，换行，输入以下内容，然后按 **Ctrl + S** 保存，关掉记事本

```
0.0.0.0 mumu.nie.netease.com
```

## 5. Conclusion

通过以上这四步，就能关闭模拟器内绝大多数广告了。如果你发现上文记述的方法失效、出现了新的广告什么的，可以在讨论区留言。
