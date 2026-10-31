---
title: '利用 opencl-vanity-gpg 计算 GPG Key'
description: '借助开源项目 opencl-vanity-gpg，利用 NVIDIA GPU 算出一个带靓号指纹的 GPG Key 用于 GitHub 提交签名。'
pubDate: 2026-10-31T17:31:20.194Z
updatedDate: 2026-10-31T17:31:20.194Z
tags: [GPG, GPU, 教程]
category: ''
---

> [!NOTE]
> 本篇文章是[利用 gpg-fingerprint-filter-gpu 计算 GPG Key](/blog/3-gpg-key-fingerprint-gpu) 的后续。如果你没看过这篇文章，建议去看看。

## 0. 说在前头

GPG Key 是什么我就不多介绍了，具体可以参考前文。

我发现[这个项目](https://github.com/TransparentLC/opencl_vanity_gpg)并写这篇文章的契机是，我重装了电脑系统，并通过 paperkey 导入了我之前的 GPG 私钥。然后我发现我的 encryption key 脱机了，于是我就尝试将其吊销，并准备添加一个新的 encryption key。

提到添加 encryption key，我自然而然地就想到了“靓号”这一说法，于是我就尝试寻找一个项目来计算子密钥靓号。虽然最后由于嫌麻烦，只是普普通通地生成了一个新的 encryption key，但是这个新的项目却值得说道。

## 1. 我怎么发现这个项目的

我一开始是从一个名为 [webgl-vanity-gpg](https://github.com/TransparentLC/webgl-vanity-gpg) 的项目开始的。我从 AI 口中得知这么一个东西，可以在网页端算号，于是我就找到了对应的项目并且查看了一下。

![项目 README 剪影](1.webp)

但是注意到这个项目需要持续开着浏览器，并且可调参数和代码也受到一些限制，于是我就按照 README 的说法跳转到了这个项目。

## 2. 我为什么选择这个项目

经过我的实测，这个项目的主要优势是它由 Rust 编写，使用 OpenCL。在我的机器上实测，它的速度能够达到 `5.67B/S`，比 `gpg-fingerprint-filter-gpu` 跑到的 `4.62B/s` 多了约 `22%` 的速度，并且在Windows上运行不需要准备WSL环境，可以直接 `cargo build --release`

## 3. 探索过程中踩到的小坑

由于本人并不写 Rust，因此电脑上没有 Rust 环境。在配置 Rust 环境并进行编译的过程中，遇到了一些小问题：

编译这个项目要求你的电脑上有 `opencl.lib`，在我的机器上，意味着它需要安装 **Nvidia CUDA toolkit**，并且在安装完成后，通过环境变量将 Nvidia CUDA toolkit 提供的 `opencl.lib` 引入到范围内。

![引入 opencl.lib 以进行编译](2.webp)

终于也是编译完成了，但是等等——为什么参数不生效？百思不得其解，我问了下 AI，发现该程序的作者设定只有 release 构建才会接受参数，否则会使用默认参数运行

```rust
// src/utils/args.rs:6-10

pub static ARGS: LazyLock<Args> = LazyLock::new(if cfg!(debug_assertions) {
    Args::default
} else {
    Args::parse
});
```

![程序不接受参数](3.webp)

折腾完这一切，距离我克隆下来这个仓库已经有 20 分钟了，总算可以开始算号了吧？！

## 4. 愉快的算号环节

由于前文所述，这个项目的算号速率比 `gpg-fingerprint-filter-gpu` 快 20% 左右的，再加上我的一些运气，实际算出来一个 12 位 GPG Key 的时间比一年半前快了不少，用时仅有上次的 60% 左右。

![成果展示](4.webp)

## 5. 后记

这个项目也是有一些局限性的，例如它仅支持一个 pattern，不能同时指定多个你能接受的 pattern（例如指定任意字符连续 12 位末尾相同），于是我对该项目进行了些许修改，使它支持了类似如下格式的输入：

```bash
./opencl_vanity_gpg.exe -c ed25519-sign -a sign -p 102410241024 -p 409640964096 -p 204820482048 -p 819281928192 -o .\vanity-keys -u "Alice <alice@example.com>" --shot-all
```

同时我还修改了代码，使它可以计算 ED25519 签名子密钥的签名，而不只局限于主密钥和加密子密钥。

我将我利用 AI 辅助修改过后的源代码[开源于此](https://github.com/SALTWOOD/opencl_vanity_gpg.git)，感兴趣的朋友可以探索一下此项目的潜力。