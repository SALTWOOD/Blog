---
title: '使用 Cloudflare 优选为 OpenBMCLAPI 助力'
description: ''
pubDate: 2025-02-17T11:33:11.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/2.webp'
tags: []
category: ''
---

<div class="wp-block-argon-alert alert" style="background-color:#ffa436"><span class="alert-inner--icon"><i class="fa fa-info-circle"></i></span><span class="alert-inner--text">此篇文章含有较多的图片，因此不适合在移动网络环境或卡顿的网络环境下阅读。</span></div>



<div class="wp-block-argon-alert alert" style="background-color:#f75676"><span class="alert-inner--icon"><i class="fa fa-exclamation-triangle"></i></span><span class="alert-inner--text"><strong>优选 IP 违反 Cloudflare 的协议，使用优选 IP 可能导致域名被列入黑名单，无法使用 Cloudflare 提供的服务。</strong><br><strong>按照本文的教程操作导致域名被封禁与本人无关，本文仅对优选 IP 的原理进行技术性记述，本人不鼓励使用优选 IP。</strong></span></div>



<div class="wp-block-argon-alert alert" style="background-color:#4fd69c"><span class="alert-inner--icon"><i class="fa fa-check"></i></span><span class="alert-inner--text">作者<strong>并不实际拥有</strong> <code>example.com</code> 和 <code>example.top</code>，因此文中的图片经过浏览器开发工具修改，<strong>仅作演示</strong>。</span></div>



<h2 class="wp-block-heading">0. 前言</h2>



<p>众所周知，Cloudflare 被称为“赛博大善人”，因其提供许多好用的免费功能，其中就包括“小黄云”。<br>但是，由于 Cloudflare 大多数节点位于国外，其对国内访问的速度也并不友好。于是，就有神人想到了“优选 IP”这一个骚操作。<br>这篇文章旨在介绍优选 IP 的原理以及通过优选 IP 部署 OpenBMCLAPI 节点。</p>



<h2 class="wp-block-heading">1. 申请节点</h2>



<p>本篇文章不再赘述，请参见本人的其他文章。</p>



<h2 class="wp-block-heading">2. Cloudflare 配置</h2>



<p>在节点申请成功、同步完所有文件之后，按照以下步骤操作：</p>



<h3 class="wp-block-heading">2.1. 购买、绑定域名</h3>



<p>你一共需要<strong>两个域名</strong>来完成此操作。这里我使用 <code>example.com</code> 和 <code>example.top</code> 代称这两个域名。</p>



<div class="wp-block-argon-alert alert" style="background-color:#4fd69c"><span class="alert-inner--icon"><i class="fa fa-info-circle"></i></span><span class="alert-inner--text">你也可以选择在 Cloudflare 购买 <code>example.com</code>，但是必须有另一个不由 Cloudflare 管理的域名（此例是 <code>example.top</code>）<br>如果你在 Cloudflare 购买了一个域名，你可以跳过此步。</span></div>



<p>首先，先将 <code>example.com</code> 添加至 Cloudflare。在 <a href="https://dash.cloudflare.com/">https://dash.cloudflare.com/</a> 注册你的账号，然后点击<strong>添加域</strong>。</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-6.webp" alt="" class="wp-image-556"/></figure>



<p>此时你会看到这样一个这样的界面，输入 <code>example.com</code>，点击继续。</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-7.webp" alt="" class="wp-image-557"/></figure>



<p>此处有四个计划，分别是 <strong>Pro, Business, Enterprise, Free</strong>。如果你是富哥可以选别的，但是 Free 在我们的需求下就够用了。</p>



<p>配置完成后，会显示如下的页面：</p>



<figure class="wp-block-image size-large"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-8-890x1024.webp" alt="" class="wp-image-558"/></figure>



<p>此处，Cloudflare 提供给我们两个 DNS 服务器，我这里是 <code>brenna.ns.cloudflare.com</code> 和 <code>craig.ns.cloudflare.com</code>。将这两个 DNS 服务器替换到你的域名购买处，如图：</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-9.webp" alt="" class="wp-image-559"/></figure>



<p>很棒！现在，<code>example.com</code> 成功地被你托管到了 Cloudflare 上，接下来还需要一个 <code>example.top</code>，但由于它不需要（也不能）托管到 Cloudflare 上，所以你随便在阿里云或者别的地方买一个就行了。</p>



<h3 class="wp-block-heading">2.2. 配置自定义主机名</h3>



<p><strong>自定义主机名（SaaS）</strong>可以将另一个域名“映射”到你的域名（回退源）。配置自定义主机名之后，访问自定义主机名域名实际访问的是回退源域名。与 CNAME 不同的是，自定义主机名经过 Cloudflare 代理流量，Cloudflare 会为客户自动处理 SSL 证书，不需要自己部署两个证书。</p>



<p>简单来说就是一个映射。为啥要这么干呢？我也不知道捏。</p>



<p>首先，先新建一个 DNS 解析，指向你的源站。我这里新建了 <code>origin.example.com</code> 到 <code>example.com</code> 的解析。<strong>记得开小黄云</strong>！你在新建解析的时候右侧有个“代理状态”开关，把它点成这个样子就是开了。</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-10.webp" alt="" class="wp-image-560"/></figure>



<div class="wp-block-argon-alert alert" style="background-color:#f4d255"><span class="alert-inner--icon"><i class="fa fa-info-circle"></i></span><span class="alert-inner--text">由于我也不知道什么原因，开启 SaaS 需要绑定付款方式，即使后面可以选择 Free 计划……<br>付款方式要银行卡或者 PayPal，没有的可以走了，记得回退更改。</span></div>



<p>然后，进入 <code>example.com</code> 的管理界面，依次点击 <strong>SSL/TLS</strong>、<strong>自定义主机名</strong>，然后设置回退源为 <code>origin.example.com</code>。</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-11.webp" alt="" class="wp-image-561"/></figure>



<p>接下来，点击上方的<strong>添加自定义主机名</strong>按钮，输入你那个不由 Cloudflare 管理的域名的一个子域。我这里使用 <code>example.top</code>，其他配置按照默认，如图这样。</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-12.webp" alt="" class="wp-image-562"/></figure>



<p>接下来，转到 <code>example.top</code> 的解析管理页面，添加如下解析：</p>



<p><code>_acme-challenge.example.top</code> <strong>CNAME</strong> <code>example.top.0000000000000000.dcv.cloudflare.com</code></p>



<p>你也可以选择使用 TXT 记录，但是 DCV 委派方便且无需担心到期。</p>



<p>添加之后，等待自定义主机名生效。</p>



<figure class="wp-block-image size-large"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-13-1024x124.webp" alt="" class="wp-image-563"/></figure>



<h3 class="wp-block-heading">2.3. 配置辅助域名</h3>



<p>上面我们已经成功地将 <code>example.top</code> 作为一个自定义主机名添加到了 Cloudflare，接下来我们需要配置辅助域名，使其解析至优选 IP。这边<strong>我再叠一次甲</strong>：</p>



<div class="wp-block-argon-alert alert" style="background-color:#f75676"><span class="alert-inner--icon"><i class="fa fa-exclamation-triangle"></i></span><span class="alert-inner--text"><strong>优选 IP 违反 Cloudflare 的协议，使用优选 IP 可能导致域名被列入黑名单，无法使用 Cloudflare 提供的服务。</strong><br><strong>按照本文的教程操作导致域名被封禁与本人无关，本文仅对优选 IP 的原理进行技术性记述，本人不鼓励使用优选 IP。</strong></span></div>



<p>好，让我们转到 <code>example.top</code>。添加如图所示的解析：</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-16.webp" alt="" class="wp-image-566"/></figure>



<p>这样子，访问 <code>example.top</code> 的时候，会被 CNAME 到优选过的 Cloudflare 代理节点，然后经过前文配置的自定义主机名，就会最终回到源站。</p>



<p>此时我们访问 <code>example.top</code>，应该会看到类似这样的页面：</p>



<figure class="wp-block-image size-large"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-18-1024x579.webp" alt="" class="wp-image-568"/></figure>



<figure class="wp-block-image size-large"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-17-1024x576.webp" alt="" class="wp-image-567"/></figure>



<p>看到这两个页面的其中一个，就说明你配置正确了，接下来需要配置 <strong>Origin Rules</strong> 和 <strong>Cache Rules</strong>。</p>



<div class="wp-block-argon-alert alert" style="background-color:#4fd69c"><span class="alert-inner--icon"><i class="fa fa-info-circle"></i></span><span class="alert-inner--text">如果你的节点本来的访问地址就是 443 端口，不需要加端口号就能访问的话，可以只配置 <strong>Cache Rules</strong>。</span></div>



<h3 class="wp-block-heading">2.4. 配置 Origin Rules 和 Cache Rules</h3>



<p>接下来，转到 <code>example.com</code> 的管理页面，点击<strong>规则</strong>，找到 <strong>Origin Rules</strong> 和 <strong>Cache Rules</strong>，分别按如下添加：</p>



<h4 class="wp-block-heading">Origin Rules</h4>



<p>选择<strong>自定义筛选表达式</strong>，然后点击<strong>编辑表达式</strong>，输入如下内容：</p>



<pre class="wp-block-code"><code>(http.host wildcard "example.top")</code></pre>



<p>然后滑到下面，选择<strong>目标端口</strong> =&gt; <strong>重写到…</strong>，输入你的 OpenBMCLAPI 节点的<strong>外部访问端口</strong>，保存规则，启用。</p>



<h4 class="wp-block-heading">Cache Rules</h4>



<p>选择<strong>自定义筛选表达式</strong>，然后点击<strong>编辑表达式</strong>，输入如下内容：</p>



<pre class="wp-block-code"><code>(http.request.full_uri wildcard "https://example.top/download/*")</code></pre>



<p><strong>缓存资格</strong>：<em><strong>符合缓存条件</strong></em></p>



<p><strong>边缘 TTL</strong>：”<em><strong>忽略缓存控制标头，使用此 TTL</strong></em>“，然后选择<strong>一年</strong>（随你便，但反正都是基于哈希的请求路径，所以不用担心更新文件导致错乱）</p>



<p><strong>浏览器 TTL</strong>：”<em><strong>替代源服务器，使用此 TTL</strong></em>“，然后也是一年</p>



<p><strong>缓存密钥</strong>：打开”<em><strong>忽略查询字符串</strong></em>“，很重要！不打开会缓存不上！</p>



<h2 class="wp-block-heading">3. 配置 OpenBMCLAPI 节点</h2>



<p>帅！配置完 <strong>Origin Rules</strong> 和 <strong>Cache Rules</strong> 之后，我们成功地搞定了优选 IP 的部分，接下来就是配置我们的节点了。</p>



<p>这是我的节点配置，你可以参考：</p>



<pre class="wp-block-code"><code class="env">CLUSTER_ID=xxxxxxxxxxxxxxxxxxxxxxxx
CLUSTER_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLUSTER_PORT=4001 #此处是你在 Origin Rules 中设置的重写端口
CLUSTER_PUBLIC_PORT=443
CLUSTER_IP=example.top
CLUSTER_BYOC=true
SSL_CERT=/path/to/your/cert/cert.pem
SSL_KEY=/path/to/your/cert/key.pem # 此处证书是你设置的源站的，也就是 example.com，上文开启小黄云的那个解析的解析目标
DISABLE_ACCESS_LOG=true</code></pre>



<p>然后，启动节点，等待一段时间，Cloudflare 将文件缓存得差不多了之后（表现为云耀斑仪表盘显示的请求很多，但每次 Keep-Alive 才上报几个兆的流量和不超过两位数的请求，具体凭个人感觉），就可以找 <strong>bangbang93</strong> 将你的节点标记为 <strong>CDN</strong> 了。</p>



<h2 class="wp-block-heading">4. 成果展示</h2>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-19.webp" alt="" class="wp-image-569"/></figure>



<figure class="wp-block-image size-large"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-20-1024x397.webp" alt="" class="wp-image-570"/></figure>



<p>大概就是这样的效果，当然你别拿晚上的和高峰期的比。</p>



<h2 class="wp-block-heading">5. 友情鸣谢</h2>



<p><a href="https://zerowolf.cn/2025/02/cf%e4%bc%98%e9%80%89/">Cloudflare 优选部署指南 - 零狼 の 小窝</a> —— 要是没看到这篇文章我都想不起来要写这玩意（</p>