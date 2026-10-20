---
title: 破除 PCL CE 新版本的中国大陆地区下载限制
description: 本文章介绍如何快速绕过 PCL CE 新版本对中国大陆地区的下载及安装限制（此方法对 HMCL 同样有效）
pubDate: '2026-10-20T12:30:12.002Z'
category: ""
tags:
  - PCL
  - 逆向
  - .NET
  - C#
pinned: 1
---

> [!WARNING]
> 由于事态紧急，我紧急用 AI 搓了这么一篇文章，会在稍后的几小时内进行人工润色，不保证其中内容的准确性。

> [!WARNING]
> PCL-CE#3676 确实由我创建，编写相关的地区限制逻辑是不得已的事情，还望大家多多理解。这篇文章会详细介绍如何绕过这个限制，不喜欢的朋友可以用此方法绕过。

## 1. 起因

各大启动器开始对中国大陆地区的下载及安装服务进行关停，原因目前未知。有传闻说是因为收到举报，广电要求先暂时下架相关功能，具体处理方式之后讨论。

我对相关事件了解不多，因此不做评价。

## 2. 限制

2026/10/20 17:56，[@Big-cake-jpg](https://github.com/Big-Cake-jpg) 开启了 [#3673](https://github.com/PCL-Community/PCL-CE/pull/3673)，后经社区讨论决定，由我开启了 [#3676](https://github.com/PCL-Community/PCL-CE/pull/3676)，以此进一步增强对中国大陆地区的下载、安装限制，以避免相关问题。

这次限制落在了两个启动器的最新构建里：

- **PCL CE**：`8cd9d374`（#3673）在客户端下载、安装、补全、重置、整合包安装等入口加了拦截；`093e0da1`（#3676）又补上了对 `DeviceRegion` 的检测。
- **HMCL**：`583e004d7`（#7017）在版本下载页和资源下载页加了地区判断；`8827fd06d`（#7020）调整了网络判定逻辑。

触发限制后，PCL CE 会弹出「Minecraft 下载、补全与整合包安装功能在你所在的国家或地区不可用。」；HMCL 则会把版本下载页和资源下载页整体置灰，并提示「根据相关法律法规，HMCL 在中国大陆地区暂不支持下载游戏相关内容。」

好消息是，这两套判断都只在客户端本地进行，没有服务端校验，也不会影响账号。只要让启动器读到的区域信号不再是大陆，功能就会恢复。下面先把两边的判定逻辑拆开看。

### 2.1 PCL CE 的判断逻辑

PCL CE 的判断集中在 `PCL.Core/App/Region/RegionPolicy.cs`。每次点击下载、安装、补全等按钮时，`RestrictedFeaturePolicy.Assess()` 都会重新读取一次 Windows 信号，再交给 `RegionPolicy.Evaluate` 分类：

```csharp
if (signals.GeoNameAvailable && IsChinaGeoName(signals.GeoName))
    return new(RegionClassification.Mainland, "geo-cn");

if (signals.DeviceRegionAvailable && IsChinaDeviceRegion(signals.DeviceRegionGeoId))
    return new(RegionClassification.Mainland, "device-region-cn");

var chinaTimeZone = signals.TimeZoneAvailable &&
                    signals.TimeZoneId is not null &&
                    ChinaTimeZones.Contains(signals.TimeZoneId);
var hasChinaLocale = signals.UserLocaleAvailable && IsChinaLocale(signals.UserLocaleName);
var hasChinaPreferredLanguage = signals.PreferredUiLanguagesAvailable &&
                                IsChinaLocale(signals.PreferredUiLanguages.FirstOrDefault());

if (chinaTimeZone && (hasChinaLocale || hasChinaPreferredLanguage))
    return new(RegionClassification.Mainland, "china-time-zone-and-locale");

if (signals.GeoNameAvailable && IsValidCountryCode(signals.GeoName) &&
    !IsChinaGeoName(signals.GeoName))
    return new(RegionClassification.Other, "geo-other");
```

读取的信号如下：

| 信号 | Windows 来源 | 判定为大陆的条件 |
| --- | --- | --- |
| `GeoName` | `GetUserDefaultGeoName`（旧系统回退到 `GetUserGeoID` + `GetGeoInfoW`） | `CN` 或 `156` |
| `DeviceRegion` | `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Control Panel\DeviceRegion` 的 `DeviceRegion` | GeoID `45` |
| `TimeZone` | `TimeZoneInfo.Local.Id` | `China Standard Time`、`Asia/Shanghai`、`PRC` |
| `UserLocale` | `GetUserDefaultLocaleName` | `zh-CN`，或以 `-CN` 结尾 |
| `PreferredUiLanguages` | `GetUserPreferredUILanguages` | 首选语言是 `zh-CN` |

注意 `RegionAssessment.IsRestricted` 的定义：

```csharp
public bool IsRestricted =>
    Classification is RegionClassification.Mainland or RegionClassification.Unknown;
```

也就是说，**读不到信号同样会被当成受限**。把区域信息清空或者改成无法识别的值，并不会让功能恢复。

被拦下的入口包括：下载 Minecraft 客户端、安装/补全/重置实例、安装整合包（本地、在线、自动）、安装 Mod 加载器，以及文件不完整时的启动流程。已经装好且文件完整的实例仍然可以正常启动——限制只加在需要补文件的操作上。

### 2.2 HMCL 的判断逻辑

HMCL 在 `HMCL/src/main/java/org/jackhuang/hmcl/util/RegionUtils.java` 里把判断拆成了「机器」和「网络」两层：

```java
private static boolean checkMachineIsChinaMainland() {
    if ("Asia/Shanghai".equals(ZoneId.systemDefault().getId()))
        return true;

    if (ZonedDateTime.now().getOffset().getTotalSeconds() == Duration.ofHours(8).toSeconds()) {
        if ("CN".equals(LocaleUtils.SYSTEM_DEFAULT.getCountry()))
            return true;

        if (OperatingSystem.CURRENT_OS == OperatingSystem.WINDOWS && NativeUtils.USE_JNA) {
            if (Kernel32.INSTANCE.GetUserGeoID(WinConstants.GEOCLASS_NATION) == 45)
                return true;
        }
    }
    return false;
}
```

只有机器判定为大陆时，才会继续做网络判定；而在网络判定里，HMCL 留了一份 **UTC+8 地区的白名单**：

```java
switch (ZoneId.systemDefault().getId()) {
    case "Antarctica/Casey",
         "Asia/Hong_Kong",
         "Asia/Irkutsk",
         "Asia/Kuching",
         "Asia/Macau",
         "Asia/Makassar",
         "Asia/Manila",
         "Asia/Singapore",
         "Asia/Taipei",
         "Asia/Ulaanbaatar",
         "Australia/Perth" -> {
        return false;
    }
}
```

命中白名单就直接返回「不是大陆网络」，连 `https://ipwho.is` 都不会请求。这本来是为了照顾这些和北京时间相近的地区的用户，但也正好成了本文要用到的突破口。

如果没有命中白名单，HMCL 会请求 `ipwho.is` 并读取 `country_code`；请求失败同样按大陆处理。判定结果会缓存在静态字段里，所以**改完设置必须重启 HMCL**。

另外，这个判定还会影响下载源偏好：大陆机器默认优先走 BMCLAPI。绕过之后如果 HMCL 把你当成海外用户，国内下载可能会变慢，需要在「设置 → 下载 → 下载源」里手动选「BMCLAPI & MCIM」。

## 3. 绕过限制

由于相关逻辑有一部分是我编写的，因此我当然再清楚不过如何绕过限制。这里直接给出被限制的条件：

> 现在满足任意条件之一就会被限制下载：
> 1. 设备安装区域为中国大陆。
> 2. 设备区域为中国大陆。
> 3. 设备时区为 China Standard Time，并且满足以下任意一个条件：
> (a) 用户区域格式（GetUserDefaultLocaleName）为 zh-CN 或以 -CN 结尾
> (b) 首选语言第一项为 zh-CN 或以 -CN 结尾

对应到代码里，就是 `DeviceRegion = 45`、`GeoName = CN`、`TimeZone = China Standard Time` 再加上中文区域格式或首选语言。

HMCL 限制条件：

- 机器判定：时区为 `Asia/Shanghai`；或时区偏移为 UTC+8，并且（用户区域格式的国家为 `CN`，或 Windows GeoID 为 `45`）。
- 网络判定（仅当机器判定为大陆时）：时区命中 UTC+8 白名单（香港、澳门、台北、新加坡等）就直接放行；否则请求 `ipwho.is`，返回 `CN` 或请求失败都算受限。

各位 Minecraft 玩家，如果仍然想要使用启动器进行下载，只需要让上面这些条件同时不成立即可。下面是两种可逆的做法。

### 3.1 方法一：改 Windows 区域设置（PCL CE + HMCL 通用）

思路是让两个启动器读到的信号同时变成「非大陆」。经过上面的代码分析，最小组合是：

1. **国家或地区**改成非中国；
2. **时区**改成「(UTC+08:00) 吉隆坡，新加坡」；
3. PCL CE 还要把 `DeviceRegion` 从 `45` 改成别的值。

这里选新加坡有两个好处：它和北京时间同为 UTC+8，日常使用完全无感；同时它又在 HMCL 的白名单里，可以同时绕开 PCL CE 的「中国时区」判断和 HMCL 的网络判定。

#### 3.1.1 先记录当前值

打开 PowerShell：

```powershell
Get-WinHomeLocation
Get-TimeZone | Select-Object Id
Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Control Panel\DeviceRegion' `
    -Name DeviceRegion -ErrorAction SilentlyContinue
```

典型的大陆机器会看到 GeoID `45`、时区 `China Standard Time`、`DeviceRegion : 45`。把输出记下来，方便之后恢复。

#### 3.1.2 改国家/地区和时区

打开「设置 → 时间和语言 → 语言和区域」：

- **国家或地区**：改成「英国」或「美国」等非中国选项。

然后打开「设置 → 时间和语言 → 日期和时间」：

- 先关闭「自动设置时区」，否则 Windows 可能根据定位把时区改回去；
- 把**时区**改成「(UTC+08:00) 吉隆坡，新加坡」。

区域格式（Regional format）不需要改，保持中文即可。PCL CE 的「中国时区 + 中文区域格式」分支要求时区本身是中国时区，而新加坡时区不在 `ChinaTimeZones` 集合里，所以不会命中。

#### 3.1.3 PCL CE：处理 DeviceRegion

`DeviceRegion` 是 Windows 在 OOBE（首次开机设置）时写入的设备区域，和后来在设置里改的「国家或地区」是两套东西。PCL CE 在 #3676 里专门补了这个检测，所以只改设置页还不够。

以管理员身份打开 PowerShell，先备份再修改。英国对应的 GeoID 是 `242`，美国是 `244`：

```powershell
$key = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Control Panel\DeviceRegion'
# 查看当前值（备份）
(Get-ItemProperty $key -Name DeviceRegion -ErrorAction SilentlyContinue).DeviceRegion
# 改成英国
Set-ItemProperty $key -Name DeviceRegion -Value 242 -Type DWord
```

如果这个键或值本来就不存在，说明你的设备没有写入 OOBE 区域，可以跳过这一步。恢复时把值改回 3.1.1 里记录的原值（通常是 `45`）即可。

#### 3.1.4 重启并验证

改完后**完全退出并重新启动**两个启动器。PCL CE 会把 `TimeZoneInfo.Local` 缓存到进程里，HMCL 更是把判定结果存进了静态字段，热改设置不会生效。

验证方式：

- PCL CE：点一下「下载 Minecraft」，不再弹出红色提示；启动器日志里也不再出现 `[RegionPolicy] 已阻止功能 ...`。
- HMCL：打开版本下载页，页面不再置灰。

### 3.2 方法二：只绕过 HMCL（不动系统设置）

如果只想让 HMCL 恢复下载，又不想改系统时区，可以用 HMCL 自带的 `HMCL_JAVA_OPTS` 环境变量注入 JVM 参数：

```bat
@echo off
set "HMCL_JAVA_OPTS=-Duser.timezone=Asia/Singapore"
start "" "HMCL-3.17.0.362.exe"
```

原理和上面一样：`ZoneId.systemDefault()` 变成 `Asia/Singapore`，偏移仍是 +8。如果区域格式或 GeoID 仍指向大陆，机器判定依旧成立，随后网络判定命中白名单，直接返回 `false`；即使机器判定为假，结果同样是不受限。这样既不用改系统时区，也不会改变时钟。

如果其他信号（区域格式、GeoID）仍然指向大陆，HMCL 会继续把你当作大陆用户，下载时优先走 BMCLAPI；如果它把你当成海外用户，手动把下载源切到「BMCLAPI & MCIM」即可。

几个注意点：

- `HMCL_JAVA_OPTS` 仅对 `HMCL-*.exe` 和 `HMCL-*.sh` 生效（HMCL 文档里写明了）。如果你直接用 `java -jar` 启动，需要把参数写在命令行里：

  ```bash
  java -Duser.timezone=Asia/Singapore -jar HMCL-3.17.0.362.jar
  ```

- 如果你的 `HMCL_JAVA_OPTS` 已经有其他参数，追加 `-Duser.timezone=Asia/Singapore` 即可，不要整个覆盖。
- 不要换成 `Asia/Kuala_Lumpur` 之类不在白名单里的 UTC+8 时区；那样会进入 `ipwho.is` 请求，在国内仍然会被判定为大陆。`Asia/Hong_Kong`、`Asia/Macau`、`Asia/Taipei` 等也可以，但新加坡与北京时间完全一致，最不容易影响日常使用。
- 改完后重启 HMCL。

## 4. 常见误区

| 做法 | PCL CE | HMCL | 说明 |
| --- | --- | --- | --- |
| 只把时区改成新加坡 | ❌ | ✅ | HMCL 命中白名单；PCL CE 仍会读到 `GeoName = CN` / `DeviceRegion = 45` |
| 只把国家/地区改成英国 | ❌ | ❌ | PCL CE 会命中「中国时区 + 中文区域格式」或 `DeviceRegion`；HMCL 的时区仍是 `Asia/Shanghai`，会去请求 `ipwho.is` |
| 国家/地区 + 新加坡时区 | ⚠️ | ✅ | 如果 `DeviceRegion` 是 `45`，PCL CE 仍受限；不是 `45` 就可用 |
| 国家/地区 + 新加坡时区 + 改 `DeviceRegion` | ✅ | ✅ | 本文推荐 |
| 只挂代理 | ❌ | ⚠️ | PCL CE 不做联网检测；HMCL 要求代理在启动前生效，且请求失败会按大陆处理 |
| 只清空区域信息 | ❌ | ❌ | `Unknown` 也算受限；`GetUserDefaultGeoName` 与定位服务无关 |
| 只加 `-Duser.timezone=Asia/Tokyo` | ❌ | ✅ | HMCL 机器判定直接为假；但会被当成海外用户，默认不走 BMCLAPI |

## 5. 恢复与注意事项

恢复原状只需要把改过的项改回去：

1. 国家或地区改回中国，时区改回「(UTC+08:00) 北京，重庆，香港特别行政区，乌鲁木齐」；
2. `DeviceRegion` 改回原来的值（通常是 `45`）；
3. 删除或修正 `HMCL_JAVA_OPTS`。

几点提醒：

- 本文针对的是 **2026-10-20 的提交**：PCL CE `093e0da1`（#3676）之后，HMCL `8827fd06d`（#7020）之后。两个项目都在快速迭代，后续版本可能增加新的信号或调整判定顺序，方法不一定长期有效。
- 如果 Windows 开着「自动设置时区」，切换网络后时区可能被改回中国时区，需要重新检查。
- 这类限制是启动器自己的客户端策略，绕过它不会解锁任何付费内容，Minecraft 仍然需要正版账号；也请遵守你所在地区的法律法规和软件许可。
- 不要从不明来源下载所谓的「破解版启动器」。本文的方法只改系统设置（或给 HMCL 加一个 JVM 参数），不修改程序本体，启动器仍然可以正常校验更新。

## 6. 参考

- PCL CE：`8cd9d374`（[#3673](https://github.com/PCL-Community/PCL-CE/pull/3673)）、`093e0da1`（[#3676](https://github.com/PCL-Community/PCL-CE/pull/3676)）
- HMCL：`583e004d7`（[#7017](https://github.com/HMCL-dev/HMCL/pull/7017)）、`8827fd06d`（[#7020](https://github.com/HMCL-dev/HMCL/pull/7020)）
