---
title: '使用 OpenLiteSpeed 搭建高性能 WordPress 站点'
description: ''
pubDate: 2025-03-23T17:05:46.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/9.webp'
tags: []
category: ''
---

<div class="wp-block-argon-alert alert" style="background-color:#f75676"><span class="alert-inner--icon"><i class="fa fa-exclamation-triangle"></i></span><span class="alert-inner--text">这篇文章我自认为写得不太好，不喜勿喷，有错误请指出我会修改。</span></div>



<h2 class="wp-block-heading">0. 起因</h2>



<p>一开始，我用的是 WordPress 官方的 Docker 镜像，在家里云上跑着倒还挺正常。<br>后面迁移到云上了经常爆，查了查原因发现是内存不够用，于是开始着手优化站点。</p>



<div class="wp-block-argon-alert alert" style="background-color:#ffa436"><span class="alert-inner--icon"><i class="fa fa-info-circle"></i></span><span class="alert-inner--text">此事在此篇文章亦有记载，具体我就不多说了，这篇文章主要是讲怎么用 LiteSpeed 搭建 WordPress。</span></div>



<figure class="wp-block-embed is-type-wp-embed"><div class="wp-block-embed__wrapper">
https://blog.ski.ink/2025/03/17/failed-blog-migration/
</div></figure>



<h2 class="wp-block-heading">1. 下载</h2>



<p>首先，安装 <strong>Git</strong>，然后运行 <code>git clone <a href="https://github.com/litespeedtech/ols-docker-env.git">https://github.com/litespeedtech/ols-docker-env.git</a></code>。</p>



<p>然后，进入 <strong>ols-docker-env</strong> 这个文件夹，此时就下载完了。</p>



<h2 class="wp-block-heading">2. 配置</h2>



<h3 class="wp-block-heading">2.1. Docker Compose</h3>



<p>如你所见，目录中有一个 <strong>docker-compose.yml</strong>。熟悉 Docker 的人可能已经 <code>docker compose up -d</code> 了，但对我来说自带的配置是有点不太方便的，于是我在这里晒一下我修改的版本：</p>



<pre class="wp-block-code"><code>services:
  mysql:
    image: mariadb:11.4
    logging:
      driver: none
    command: &#91;"--max-allowed-packet=512M"]
    volumes:
      - "./data/db:/var/lib/mysql:delegated"
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    restart: always
    networks:
      - default
  litespeed:
    image: litespeedtech/openlitespeed:${OLS_VERSION}-${PHP_VERSION}
    container_name: litespeed
    env_file:
      - .env
    volumes:
      - ./lsws/conf:/usr/local/lsws/conf
      - ./lsws/admin-conf:/usr/local/lsws/admin/conf
      - ./bin/container:/usr/local/bin
      - ./sites:/var/www/vhosts/
      - /root/.acme.sh/:/root/.acme.sh/:ro
      - ./logs:/usr/local/lsws/logs/
    ports:
      - 80:80
      - 443:443
      - 443:443/udp
      - 7080:7080
    restart: always
    environment:
      TZ: ${TimeZone}
    networks:
      - default
  redis:
    image: "redis:alpine"
    logging:
      driver: none
    command: redis-server --requirepass <strong>&lt;RANDOM_PASSWORD&gt;</strong> <strong># 记得更改此处！</strong>
    volumes:
      - ./redis/data:/var/lib/redis
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    environment:
      - REDIS_REPLICATION_MODE=master
    restart: always
    networks:
      - default
networks:
  default:
    driver: bridge</code></pre>



<p>我修改的版本主要是移除了 PhpMyAdmin、给 Redis 加了个密码，以及修改了一下 acme.sh 的挂载位置（因为宿主机上就有 acme.sh 所以我直接复用了）</p>



<h3 class="wp-block-heading">2.2. OpenLiteSpeed</h3>



<p>此时就算把 Docker Compose 配置好了。使用 <code>docker compose up -d</code> 启动容器，接下来我们来配置 OpenLiteSpeed。</p>



<p>首先，使用以下命令设置一个密码（用于登录 OpenLiteSpeed 的 WebUI）</p>



<pre class="wp-block-code"><code>bash bin/webadmin.sh <strong>&lt;YOUR_PASSWORD&gt;</strong></code></pre>



<p>接下来，使用这个命令新建一个域名</p>



<pre class="wp-block-code"><code>bash bin/domain.sh -A <strong>&lt;YOUR_DOMAIN&gt;</strong></code></pre>



<p>再新建一个数据库</p>



<pre class="wp-block-code"><code>bash bin/database.sh -D <strong>&lt;YOUR_DOMAIN&gt;</strong></code></pre>



<p>执行完毕后，控制台会给出账号密码，记得妥善保存</p>



<p>然后安装 WordPress</p>



<pre class="wp-block-code"><code>./bin/appinstall.sh -A wordpress -D <strong>&lt;YOUR_DOMAIN&gt;</strong></code></pre>



<p>安装完毕之后，浏览器打开，然后正常安装 WordPress。如果你有数据需要迁移的话稍后会提到。</p>



<h4 class="wp-block-heading">2.2.1. 额外配置</h4>



<p>如果你没有 ACME，也没有证书，你需要再安装一下 ACME。</p>



<p>使用以下命令安装</p>



<pre class="wp-block-code"><code>./bin/acme.sh -I -E <strong>&lt;YOUR_EMAIL_ADDRESS&gt;</strong></code></pre>



<p>然后使用这个命令申请证书</p>



<pre class="wp-block-code"><code>./bin/acme.sh -D <strong>&lt;YOUR_DOMAIN&gt;</strong></code></pre>



<h3 class="wp-block-heading">2.3. WordPress</h3>



<p>登录 WordPress 管理后台，在侧边栏找到 <strong>LiteSpeed Cache</strong>，找到 <strong>Cache Rules</strong>（缓存规则），点击上方的 <strong>[6] 对象</strong>（Object），修改成如图的设置</p>



<figure class="wp-block-image size-large"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-56-1024x987.webp" alt="" class="wp-image-590"/></figure>



<p>需要注意的是，下方的密码在我给出的修改版 Docker Compose 配置文件中有提到，如果你没设置密码（也就是 command 那行是注释的状态）则密码那行可以留空。</p>



<p>到这里，我们就把整个站点大多数的东西配置完了。</p>



<h2 class="wp-block-heading">3. 简单的数据迁移</h2>



<div class="wp-block-argon-alert alert" style="background-color:#f75676"><span class="alert-inner--icon"><i class="fa fa-exclamation-triangle"></i></span><span class="alert-inner--text">我这里使用的方法是我第一直觉想出来的，肯定有些问题，照着学出问题自行负责，没那个技术力的话看看就好。</span></div>



<p>为了将上传的文件和插件迁移过去，我使用了一个骚操作：</p>



<p>在 <code>ols-wordpress/sites/<strong>&lt;YOUR_DOMAIN&gt;</strong>/html/wp-content</code> 这个地方有很多文件夹，其中插件、主题和上传的文件分别存储在 <strong>plugins themes uploads</strong> 三个文件夹中。</p>



<p>于是我就直接将这三个文件夹复制过来了，打开站点，乍一看似乎没问题，但是在进行一些操作的时候提示没权限。此时使用 <code>ls -l</code> 看了下权限，发现权限不一样，正常应该是这样的——</p>



<figure class="wp-block-image size-full"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-57.webp" alt="" class="wp-image-591"/></figure>



<p>我这里，<strong>litespeed、object-cache.php</strong> 两个文件属于一个叫 <strong>debian</strong> 的用户，想来是容器里头系统的用户。</p>



<p>既然没权限，那就 <strong>chown</strong> 呗。在 wp-content 下使用 <code>chown -R debian ./*</code> 解决问题，至此网站顺利迁移完毕。</p>