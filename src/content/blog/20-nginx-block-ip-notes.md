---
title: '【随手记】借助 Nginx 拦截指定 IP 访问'
description: ''
pubDate: 2026-01-08T11:59:21.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/20.webp'
tags: [Nginx, 安全, 随笔]
category: ''
---

<div class="wp-block-argon-alert alert" style="background-color:#f75676"><span class="alert-inner--icon"><i class="fa fa-exclamation-triangle"></i></span><span class="alert-inner--text">这篇文章很水。内容质量较为低下，算是一个随手记。</span></div>



<h2 class="wp-block-heading">0. 前言</h2>



<p>新年快乐！有好几个月没碰博客了，在这里祝大家 2026 新年快乐.</p>



<p>新的一年，博客一直被爆破，虽然也没爆破成功，但是机器人的通知一直发过来跟鞭炮似的吵死了，于是研究了一下加了个拦截。</p>



<h2 class="wp-block-heading">1. 正文</h2>



<div class="wp-block-group">
<figure class="wp-block-image size-full is-resized"><a href="https://blog.ski.ink/wp-content/uploads/2026/01/image.webp"><img src="https://blog.ski.ink/wp-content/uploads/2026/01/image.webp" alt="" class="wp-image-765" style="width:303px;height:auto"/></a></figure>



<p>如左图，咱的博客一直被某个 91.93 开头的 IP 尝试登录。研究了一会 Nginx 的 geo 模块，这里记录一下新的发现。<br><br>因为我的博客使用了 CDN，源地址要从 X-Real-IP 拿，还有一些特定条件，也就是说不是所有情况都能直接取 X-Real-IP 的值，所以不能直接拿 deny。</p>
</div>



<pre class="wp-block-code"><code>geo $real_ip $is_blocked { # 这里 $real_ip 是一个 map
    default 0;
    include /etc/nginx/blockip.conf; # 黑名单文件
}

server {
    # ...省略配置...

    # 拦截爆破
    if ($is_blocked) {
        default_type text/plain;
        return 418 "Stop brute-force attacks on my blog website. Thank you."; 
    }
}</code></pre>



<p>只要照着上面的代码改一下，然后创建一个 <code>/etc/nginx/blockip.conf</code>，写入类似这样的内容：</p>



<pre class="wp-block-code"><code>123.45.67.89 1;
1.2.3.4 1;
10.0.0.0/24 1; # 支持网段</code></pre>



<p>然后 <code>systemctl reload nginx</code> 一下，就好了</p>