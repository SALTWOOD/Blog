---
title: '利用 gpg-fingerprint-filter-gpu 计算 GPG Key'
description: ''
pubDate: 2025-02-18T11:22:40.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/3.webp'
tags: [GPG, GPU, 教程]
category: ''
---

<div class="wp-block-argon-alert alert" style="background-color:#4fd69c"><span class="alert-inner--icon"><i class="fa fa-info-circle"></i></span><span class="alert-inner--text">需要注意的是，GPG Key 的计算是一个很靠运气和算力的事情，可能一个号码一秒出来，也可能算个几天毫无成果。</span></div>



<h2 class="wp-block-heading">0. GPG Key 能干啥？</h2>



<p>简单来说，<strong>GPG Key</strong> 是一种用于加密和签名的公钥加密技术，广泛应用于保护电子邮件和文件的安全。这篇文章里的 GPG Key 被用在 <strong>GitHub</strong> 上用于签名提交。</p>



<h2 class="wp-block-heading">1. 为什么要“算号”？</h2>



<p>这就和有人想要一个 QQ 靓号或者电话靓号一样的道理。</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-24.webp" alt="" class="wp-image-574"/></figure>



<p>如图，这是<strong>米露大佬</strong>的 GPG Key 在签名提交时的显示。这里的“号”指的是一个 Key 的 ID。</p>



<h2 class="wp-block-heading">2. 开始前的准备工作</h2>



<p>这里我使用了一个开源项目。</p>



<div class="wp-block-argon-github github-info-card card shadow-sm github-info-card-full" data-author="cuihaoleo" data-project="gpg-fingerprint-filter-gpu"><div class="github-info-card-header"><a href="https://github.com/" target="_blank" title="Github" rel="noopener"><span><i class="fa fa-github"></i> GitHub</span></a></div><div class="github-info-card-body"><div class="github-info-card-name-a"><a href="https://github.com/cuihaoleo/gpg-fingerprint-filter-gpu" target="_blank" rel="noopener"><span class="github-info-card-name">cuihaoleo/gpg-fingerprint-filter-gpu</span></a></div><div class="github-info-card-description"></div></div><div class="github-info-card-bottom"><span class="github-info-card-meta github-info-card-meta-stars"><i class="fa fa-star"></i> <span class="github-info-card-stars"></span></span><span class="github-info-card-meta github-info-card-meta-forks"><i class="fa fa-code-fork"></i> <span class="github-info-card-forks"></span></span></div></div>



<p>这个项目需要使用英伟达的 GPU。一般来说，GPU 的计算速率都是比 CPU 快的。如果你没有英伟达的 GPU，你可以去 <strong>autodl</strong><s>（自动大佬）</s>买一个，一般十块钱就能算出好几个 12 位相同的 Key 了。</p>



<p>这里因为我有英伟达的 GPU，我就在本地部署。一般来说，你需要这些环境：</p>



<ol class="wp-block-list">
<li>“必须运行 <strong>Windows 10 版本 2004</strong> 及更高版本（内部版本 19041 及更高版本）或 <strong>Windows 11</strong>”</li>



<li>安装 <strong>WSL</strong>（这个在微软商店搜索 Linux 什么的就能下到，我使用的是 <strong>Ubuntu 22.04.5 LTS</strong>）</li>



<li>基于 WSL 显卡直通的 NVIDIA <strong>Cuda</strong> 环境（下文讲解）</li>
</ol>



<h2 class="wp-block-heading">3. 正式部署</h2>



<p>先使用命令 <code>git clone https://github.com/cuihaoleo/gpg-fingerprint-filter-gpu.git</code> 克隆项目下来。</p>



<figure class="wp-block-image size-large"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-25-1024x580.webp" alt="" class="wp-image-575"/></figure>



<p>下载下来大概是这么个结构。此时，<strong>Shift</strong> + 右键空白处，点击“在此处打开 Linux shell(L)”</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-26.webp" alt="" class="wp-image-576"/></figure>



<p>然后在弹出的窗口执行 <code>make</code>。</p>



<pre class="wp-block-code"><code>saltwood@SALTWOOD-DESKTOP:~/gpg-fingerprint-filter-gpu$ make
nvcc -c -o key_test.o -O3 -std=c++14 --compiler-options -Wall,-Wextra `pkg-config --cflags libgcrypt` key_test.cpp
/bin/sh: 1: nvcc: not found
make: *** &#91;Makefile:17: key_test.o] Error 127</code></pre>



<p>这是怎么回事呢？缺少 <strong>nvcc</strong>。我们去谷歌搜索一下就能发现这篇文章——<a href="https://learn.microsoft.com/zh-cn/windows/ai/directml/gpu-cuda-in-wsl">在 WSL 2 上启用 NVIDIA CUDA | Microsoft Learn</a>。</p>



<p>我们照着这篇文章的步骤，安装 CUDA——盐木当然知道你懒啦，指令在下面，自取哦 <strong>=v=</strong></p>



<pre class="wp-block-code"><code>sudo dpkg -i cuda-repo-*.deb
sudo apt-key adv --fetch-keys http://developer.download.nvidia.com/compute/cuda/repos/$(lsb_release -c | awk '{print $2}')/x86_64/7fa2af80.pub
sudo apt-get update
sudo apt-get install cuda
export PATH=/usr/local/cuda/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
source ~/.bashrc</code></pre>



<p>安装完之后，执行 <code>nvcc --version</code>，检查输出——</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-27.webp" alt="" class="wp-image-577"/></figure>



<p>然后，回到上面的地方，再次执行 <code>make</code>。</p>



<figure class="wp-block-image size-large"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-28-1024x110.webp" alt="" class="wp-image-578"/></figure>



<p>如图这样就是成功了。此时我们执行 <code>ls</code> 就能看到一个叫 <code>gpg-fingerprint-filter-gpu</code>、闪着绿光的文件。执行 <code>./gpg-fingerprint-filter-gpu</code>，应该能看到这样的输出——</p>



<figure class="wp-block-image size-large"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-29-1024x317.webp" alt="" class="wp-image-579"/></figure>



<p>这样就是成功构建程序了，接下来就是传入参数，让它算号了。</p>



<h2 class="wp-block-heading">4. 使用</h2>



<p>这边我先给出一个示例命令。</p>



<pre class="wp-block-code"><code>./gpg-fingerprint-filter-gpu -a ed25519 'x{12}' -m Y output</code></pre>



<p>解释一下这个命令。</p>



<ul class="wp-block-list">
<li><code>-a</code> 参数指定算出来的 Key 的类型，一般是 <strong>ed25519</strong> 或者 <strong>rsa</strong>。实测使用 ed25519 会快些，但是 ed25519 有些很旧的设备不支持。</li>



<li><code>'x{12}'</code> 这个位置是一个正则表达式，此处的 <strong>x{12}</strong> 是指<strong><strong>算出来的 Key 的 ID</strong></strong> 需要有 12 个相同的字母，你也可以替换成别的，例如 <strong>x{16}</strong> 表示要 16 个相同的字母（但这一般算得很久），<strong>142857142857</strong> 代表需要<strong>算出来的 Key 的 ID</strong> 的末尾以 <strong>142857142857</strong> 结尾。</li>



<li><code>-m</code> 代表是否在出现符合条件的结果时继续。如果为 <strong>Y</strong> 则表示继续算，为 <strong>N</strong> 表示找到一个符合要求的就停。如果你不加的话默认就是 <strong>N</strong>。</li>



<li><code>output</code> 这里是指输出文件夹，算出来的 Key 会在这个名字的文件夹里头。你也可以换成别的，但是记得要有写入权限，不然辛辛苦苦算出来一个没写入成功就浪费了。</li>
</ul>



<p>同时，在计算的时候会显示计算速率。作为参考，我的 <strong>RTX 2060super</strong> 的计算速率如下：</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-31.webp" alt="" class="wp-image-581"/></figure>



<p>一般来说，如果你的速度很低，那就是不正常。</p>



<h2 class="wp-block-heading">5. Key 的使用</h2>



<p>本来这一段不属于本文的内容的，但是还是粗略讲一下。</p>



<p>使用 <code>gpg --allow-non-selfsigned-uid --import &lt;输出的文件名&gt;</code> 就行了。导入之后，在 <strong>Kelopatra</strong> 添加一下你的邮箱地址什么的就行了。</p>



<p>然后，如果你把这个 Key 用于 GitHub 的提交签名的话，使用以下命令：</p>



<pre class="wp-block-code"><code>git config --global commit.gpgsign true
git config --global user.signingkey &lt;这里填写你算出来的 Key 的短 ID&gt;</code></pre>



<p>同时，记得在 <a href="https://github.com/settings/keys">SSH and GPG keys</a> 添加上你的 GPG Key，否则是没用的。</p>



<p>这是我的成果：</p>



<figure class="wp-block-image size-full is-resized"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-32.webp" alt="" class="wp-image-582" style="width:488px;height:auto"/></figure>