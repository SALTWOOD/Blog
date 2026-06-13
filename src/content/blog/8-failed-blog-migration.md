---
title: '记一次失败的博客迁移'
description: ''
pubDate: 2025-03-16T18:04:42.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/8.webp'
tags: []
category: ''
---

<p>前几天备案下来了，于是想着去迁移一下博客放到另一台机子上。<br>但是好巧不巧遇上几个坑……心态爆炸就迁回来了。<br>在此记录一下，有谁想迁移的可以看看 =。=</p>



<h2 class="wp-block-heading">1. 反复重定向</h2>



<p>这应该是最经典的一个了，原因是 <code>siteurl</code> 和 <code>home</code> 没有设置好，会导致 WordPress <strong>反复给你重定向</strong>过去，于是就会导致怎么都进不去网站。</p>



<p>解决方案很简单，那就是——</p>



<pre class="wp-block-code"><code>UPDATE wp_options SET option_value = '&lt;YOUR_NEW_URL&gt;' WHERE option_name = 'siteurl';
UPDATE wp_options SET option_value = '&lt;YOUR_NEW_URL&gt;' WHERE option_name = 'home';</code></pre>



<p>这样就可以修改掉这两个 URL 了。</p>



<h2 class="wp-block-heading">2. MySQL 到 MariaDB 的迁移：文件直接复制？小心数据爆炸</h2>



<p>本以为 MySQL 和 MariaDB 同源，直接把 <code>/var/lib/mysql</code> 目录复制过去就能用。结果启动 MariaDB 时报错，这才发现版本差异可能导致数据文件不兼容。</p>



<p>经我测试，可靠方案是用 mysqldump 导出 SQL 文件：</p>



<pre class="wp-block-code"><code># 原服务器执行
mysqldump -u root -p --databases wordpress_db &gt; wp_db.sql

# 新服务器导入前先创建空数据库
mysql -u root -p -e "CREATE DATABASE wordpress_db;"
mysql -u root -p wordpress_db &lt; wp_db.sql</code></pre>



<p>以及这里有点小坑的是：小内存机器这么干极有可能把机子爆了，建议一点一点执行。</p>



<h2 class="wp-block-heading">3. Docker 镜像使用的 Apache 爆炸</h2>



<p>以前使用官方 <code>wordpress</code> 镜像，在家里云上跑都没什么问题。</p>



<p>后面迁移了机子，内存只有可怜的 2GB，多来几次访问就会爆炸，找托管商重启了几回才发现是内存爆了，然后 <code>kswapd0</code> 出来，又把 CPU 和硬盘爆掉，于是整个机子没了。</p>



<p>这个没什么很好的解决方案，我的建议是加内存或者换 Nginx。</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-43.webp" alt="" class="wp-image-599"/></figure>



<p>看了看发现 MySQL 占用也挺大的，换 <strong>MariaDB</strong> 也可以省下很多内存。</p>



<h2 class="wp-block-heading">4. 补药用 1Panel</h2>



<p>这个不想仔细分析原因，因为 1Panel 太傻瓜了，防傻瓜做得<strong>太到位</strong>，导致改个东西都有关联资源不能改。</p>



<p>我的建议是，如果你不是完全不会且懒得搜素，就直接命令行。</p>