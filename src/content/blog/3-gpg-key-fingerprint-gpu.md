---
title: '利用 gpg-fingerprint-filter-gpu 计算 GPG Key'
description: ''
pubDate: 2025-02-18T11:22:40.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/3.webp'
tags: [GPG, GPU, 教程]
category: ''
---

> [!NOTE]
> 需要注意的是，GPG Key 的计算是一个很靠运气和算力的事情，可能一个号码一秒出来，也可能算个几天毫无成果。

## 0. GPG Key 能干啥？

简单来说，**GPG Key** 是一种用于加密和签名的公钥加密技术，广泛应用于保护电子邮件和文件的安全。这篇文章里的 GPG Key 被用在 **GitHub** 上用于签名提交。

## 1. 为什么要"算号"？

这就和有人想要一个 QQ 靓号或者电话靓号一样的道理。

![](https://static.ski.ink/old-blog/uploads/2025/05/image-24.webp)

如图，这是**米露大佬**的 GPG Key 在签名提交时的显示。这里的"号"指的是一个 Key 的 ID。

## 2. 开始前的准备工作

这里我使用了一个开源项目。

[GitHub](https://github.com/)

[cuihaoleo/gpg-fingerprint-filter-gpu](https://github.com/cuihaoleo/gpg-fingerprint-filter-gpu)

这个项目需要使用英伟达的 GPU。一般来说，GPU 的计算速率都是比 CPU 快的。如果你没有英伟达的 GPU，你可以去 **autodl**~~（自动大佬）~~买一个，一般十块钱就能算出好几个 12 位相同的 Key 了。

这里因为我有英伟达的 GPU，我就在本地部署。一般来说，你需要这些环境：

1. "必须运行 **Windows 10 版本 2004** 及更高版本（内部版本 19041 及更高版本）或 **Windows 11**"
2. 安装 **WSL**（这个在微软商店搜索 Linux 什么的就能下到，我使用的是 **Ubuntu 22.04.5 LTS**）
3. 基于 WSL 显卡直通的 NVIDIA **Cuda** 环境（下文讲解）

## 3. 正式部署

先使用命令 `git clone https://github.com/cuihaoleo/gpg-fingerprint-filter-gpu.git` 克隆项目下来。

![](https://static.ski.ink/old-blog/uploads/2025/05/image-25-1024x580.webp)

下载下来大概是这么个结构。此时，**Shift** + 右键空白处，点击"在此处打开 Linux shell(L)"

![](https://static.ski.ink/old-blog/uploads/2025/05/image-26.webp)

然后在弹出的窗口执行 `make`。

```bash
saltwood@SALTWOOD-DESKTOP:~/gpg-fingerprint-filter-gpu$ make
nvcc -c -o key_test.o -O3 -std=c++14 --compiler-options -Wall,-Wextra `pkg-config --cflags libgcrypt` key_test.cpp
/bin/sh: 1: nvcc: not found
make: *** [Makefile:17: key_test.o] Error 127
```

这是怎么回事呢？缺少 **nvcc**。我们去谷歌搜索一下就能发现这篇文章——[在 WSL 2 上启用 NVIDIA CUDA | Microsoft Learn](https://learn.microsoft.com/zh-cn/windows/ai/directml/gpu-cuda-in-wsl)。

我们照着这篇文章的步骤，安装 CUDA——盐木当然知道你懒啦，指令在下面，自取哦 **=v=**

```bash
sudo dpkg -i cuda-repo-*.deb
sudo apt-key adv --fetch-keys http://developer.download.nvidia.com/compute/cuda/repos/$(lsb_release -c | awk '{print $2}')/x86_64/7fa2af80.pub
sudo apt-get update
sudo apt-get install cuda
export PATH=/usr/local/cuda/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
source ~/.bashrc
```

安装完之后，执行 `nvcc --version`，检查输出——

![](https://static.ski.ink/old-blog/uploads/2025/05/image-27.webp)

然后，回到上面的地方，再次执行 `make`。

![](https://static.ski.ink/old-blog/uploads/2025/05/image-28-1024x110.webp)

如图这样就是成功了。此时我们执行 `ls` 就能看到一个叫 `gpg-fingerprint-filter-gpu`、闪着绿光的文件。执行 `./gpg-fingerprint-filter-gpu`，应该能看到这样的输出——

![](https://static.ski.ink/old-blog/uploads/2025/05/image-29-1024x317.webp)

这样就是成功构建程序了，接下来就是传入参数，让它算号了。

## 4. 使用

这边我先给出一个示例命令。

```bash
./gpg-fingerprint-filter-gpu -a ed25519 'x{12}' -m Y output
```

解释一下这个命令。

- `-a` 参数指定算出来的 Key 的类型，一般是 **ed25519** 或者 **rsa**。实测使用 ed25519 会快些，但是 ed25519 有些很旧的设备不支持。
- `'x{12}'` 这个位置是一个正则表达式，此处的 **x{12}** 是指**算出来的 Key 的 ID** 需要有 12 个相同的字母，你也可以替换成别的，例如 **x{16}** 表示要 16 个相同的字母（但这一般算得很久），**142857142857** 代表需要**算出来的 Key 的 ID** 的末尾以 **142857142857** 结尾。
- `-m` 代表是否在出现符合条件的结果时继续。如果为 **Y** 则表示继续算，为 **N** 表示找到一个符合要求的就停。如果你不加的话默认就是 **N**。
- `output` 这里是指输出文件夹，算出来的 Key 会在这个名字的文件夹里头。你也可以换成别的，但是记得要有写入权限，不然辛辛苦苦算出来一个没写入成功就浪费了。

同时，在计算的时候会显示计算速率。作为参考，我的 **RTX 2060super** 的计算速率如下：

![](https://static.ski.ink/old-blog/uploads/2025/05/image-31.webp)

一般来说，如果你的速度很低，那就是不正常。

## 5. Key 的使用

本来这一段不属于本文的内容的，但是还是粗略讲一下。

使用 `gpg --allow-non-selfsigned-uid --import <输出的文件名>` 就行了。导入之后，在 **Kelopatra** 添加一下你的邮箱地址什么的就行了。

然后，如果你把这个 Key 用于 GitHub 的提交签名的话，使用以下命令：

```bash
git config --global commit.gpgsign true
git config --global user.signingkey <这里填写你算出来的 Key 的短 ID>
```

同时，记得在 [SSH and GPG keys](https://github.com/settings/keys) 添加上你的 GPG Key，否则是没用的。

这是我的成果：

![](https://static.ski.ink/old-blog/uploads/2025/05/image-32.webp)
