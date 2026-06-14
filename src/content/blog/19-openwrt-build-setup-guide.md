---
title: 'OpenWRT 入门——构建、安装与配置'
description: ''
pubDate: 2025-09-30T19:52:52.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/19.webp'
tags: [OpenWrt, 路由器, 教程]
category: ''
---

## 0. 前言

也是好久没写文章了，来更新一波我的博客。  
最近整了一套稳定的家里云，原本我的所有家里云服务都是跑在一个软路由上面的，现在有了专门的机子跑服务，于是这个软路由终于可以开始发挥它软路由的作用了。借此机会写一篇文章记录一下 OpenWRT 折腾的过程。

## 1. 什么是 OpenWRT

这一部分的话，既然你都搜到这篇文章进来看了，我相信你也不需要了解这些。但保险起见，我用一句话总结一下。

> **OpenWRT 能将你的普通路由器变身为一台高度可定制、功能强大的迷你 Linux 服务器，让你实现广告过滤、网络加速、异地组网等高级功能，甚至原地起飞，瞬移🇺🇸，彻底掌控你的网络。**

## 2. 获取镜像

OpenWRT 官方提供了 [Firmware Selector](https://firmware-selector.openwrt.org/)，如果你的机子有兼容的镜像，你可以选择直接下载一个然后刷入。如果你需要一些自定义，你可以选择自己编译镜像。

同时，OpenWRT 作为享誉全球的软路由系统，也有很多修改版，如 [iStoreOS](https://github.com/istoreos/istoreos) 等，你可以自由选择。

## 3. 编译镜像

如果你选择通过 **Firmware Selector** 获取镜像，或者是选择了一个现成的改版，你可以跳过这步，直接跳到 **4. 安装**。这段将会介绍如何编译 OpenWRT 镜像。

### 3.1. 准备工作

你需要：

- 一台多核比较好的 Linux 机子（这里建议 Debian 12 或者 Ubuntu 之类的）
- 一个能够承载 OpenWRT 的主机或准系统
- 一些网线
- 一个有折腾精神和一些技术底子的脑子和一些耐心

好了，东西都备齐了，现在开始准备编译环境。首先，在你的 Linux 机子上（本例使用 Debian 13），打开终端，安装编译需要的依赖包：

```bash
sudo apt update
sudo apt install build-essential clang flex bison g++ gawk \
gcc-multilib g++-multilib gettext git libncurses5-dev libssl-dev \
python3-setuptools rsync swig unzip zlib1g-dev file wget
```

装完这些，你的机子就差不多能开始编译 OpenWRT 了。记得保证网络稳定，编译过程会下载一些依赖啥的，如果你的网络不大好记得启用魔法，应该会好很多。

### 3.2. 选择 Release

一般来说我们都会选择一个 Release 进行编译，如果直接拉最新的代码下来编译，轻则出现稳定性问题，重则跟我这个笨蛋一样根本编译不起来。

运行以下命令，选择一个顺眼的**版本/分支**

```bash
git branch -a
git tag
```

截至本文发布时，最新的是 **v24.10.3**。运行以下命令，checkout 到你选择的版本。

```bash
git checkout <VERSION/BRANCH>
```

### 3.3. 更新 Feeds

简单来说，**Feeds 就是 OpenWRT 的"软件仓库"或"应用商店"，让你能在编译时选择安装各种额外的软件包。**

运行以下命令，更新一下 Feeds。

```bash
./scripts/feeds update -a
./scripts/feeds install -a
```

运行结束之后，如果没有出现大面积的 WARNING，基本就是成功了。如下图，左侧是成功案例，右侧是失败案例。如果失败了，可以使用 `./scripts/feeds clean` 清除 Feeds 然后再试一遍。

[![Feeds 更新成功图](https://static.ski.ink/blog-uploads/19/images/1.webp)](https://static.ski.ink/blog-uploads/19/images/1.webp)

[![Feeds 更新失败图](https://static.ski.ink/blog-uploads/19/images/2.webp)](https://static.ski.ink/blog-uploads/19/images/2.webp)

### 3.4. 配置

接下来我们要对 OpenWRT 进行配置。这一步决定了构建出来的 OpenWRT 长啥样子，内置哪些软件包，以及适用于哪些设备。

运行以下命令，打开一个图形化的配置界面。

```bash
make menuconfig
```

你会看到如下图的界面

[![配置界面图](https://static.ski.ink/blog-uploads/19/images/3.webp)](https://static.ski.ink/blog-uploads/19/images/3.webp)

我这里是为我的 x86 主机编译镜像，因此选用了如下配置。进入菜单使用 Enter，退出菜单使用双击 Esc

- **Target System:** x86
- **Subtarget:** x86_64
- **Target Profile:** Generic x86/64

进入 **Target Images**，取消 `[ ] ext4`，然后根据你的系统使用 BIOS 还是 UEFI，取消勾选其中一项。

- `Build GRUB images (Linux x86 or x86_64 host only)`
- `Build GRUB EFI images`

最后根据你的机子选用哪种镜像，勾选 `.tar.gz` 之类的选项。本人选择了 `Build LiveCD image (ISO)`，便于后面刷系统。

双击 Esc 退出，弹出窗口询问是否保存，按 Enter 选择 Yes。

### 3.5. 编译！

配置好了，开始编译：

```bash
make defconfig download clean world -j$(nproc) V=s
```

这步最耗时，取决于你的 CPU 核心数。我编译的时候去打了两把窝，半小时就好了。如果出错，检查依赖或配置，试试 `make clean` 之类的清理一下，或者网上搜搜错误信息一般能解决。

[![编译中图](https://static.ski.ink/blog-uploads/19/images/4.webp)](https://static.ski.ink/blog-uploads/19/images/4.webp)

## 4. 安装

通过编译或者直接下载取得镜像文件之后，就是刷入镜像了。

刷机方法看你的设备：

- 如果像我一样是 x86 设备，直接使用 **Rufus** 这样的工具，将获取到的镜像文件刷到硬盘，就可以启动
- 如果设备原厂系统支持 Web 刷机，就进管理界面上传 `factory.bin`。
- 如果有 Breed 或 U-Boot 引导，可以用 TFTP 方式刷，具体搜你设备的教程。
- 刷机前**一定备份数据**！万一变砖了还能救回来。刷的时候别断电，耐心等它重启。

刷完机，机器重启后，就该进入配置阶段了。

## 5. 配置

现在，用网线连接路由器的 LAN 口和电脑，浏览器打开 `http://192.168.1.1`。

第一次进入之后，记得修改/设置 root 密码，**一定要设定一个能记住的、高强度的密码**，此前就有很多 OpenWRT 使用弱密码甚至不设密码公开到公网被打的例子。

基本配置：

- **WAN 口上网**：在「网络」-「接口」里，改 WAN 口协议。如果你是拨号上网，选 PPPoE 填账号密码（账号密码一般询问运营商就能得到）；如果接上级路由，选 DHCP 就行。
- **Wi-Fi 设置**：在「网络」-「无线」里，启用无线，设个 SSID 和密码。建议用 WPA2-PSK 加密，安全点。**如果你没有接天线，这一步就可以略过了。**
- **LAN 口配置**：一般不用动，但如果内网 IP 段冲突，可以改 LAN 口的 IP 地址。如果你需要大一些的地址段，可以修改子网掩码。

这些都设好，你的 OpenWRT 就能正常上网了。

## 6. 总结

此时，你的 OpenWRT 就配置完了。进阶玩法不在此文章中赘述，如果有时间，我会在后期编写额外的文章。
