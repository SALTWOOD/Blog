---
title: '使用 OpenLiteSpeed 搭建高性能 WordPress 站点'
description: ''
pubDate: 2025-03-23T17:05:46.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/9.webp'
tags: [WordPress, OpenLiteSpeed, Docker]
category: ''
---

> [!WARNING]
> 这篇文章我自认为写得不太好，不喜勿喷，有错误请指出我会修改。

## 0. 起因

一开始，我用的是 WordPress 官方的 Docker 镜像，在家里云上跑着倒还挺正常。  
后面迁移到云上了经常爆，查了查原因发现是内存不够用，于是开始着手优化站点。

> [!NOTE]
> 此事在此篇文章亦有记载，具体我就不多说了，这篇文章主要是讲怎么用 LiteSpeed 搭建 WordPress。

https://blog.ski.ink/2025/03/17/failed-blog-migration/

## 1. 下载

首先，安装 **Git**，然后运行 `git clone https://github.com/litespeedtech/ols-docker-env.git`。

然后，进入 **ols-docker-env** 这个文件夹，此时就下载完了。

## 2. 配置

### 2.1. Docker Compose

如你所见，目录中有一个 **docker-compose.yml**。熟悉 Docker 的人可能已经 `docker compose up -d` 了，但对我来说自带的配置是有点不太方便的，于是我在这里晒一下我修改的版本：

```yaml
services:
  mysql:
    image: mariadb:11.4
    logging:
      driver: none
    command: ["--max-allowed-packet=512M"]
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
    command: redis-server --requirepass <RANDOM_PASSWORD> # 记得更改此处！
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
    driver: bridge
```

我修改的版本主要是移除了 PhpMyAdmin、给 Redis 加了个密码，以及修改了一下 acme.sh 的挂载位置（因为宿主机上就有 acme.sh 所以我直接复用了）

### 2.2. OpenLiteSpeed

此时就算把 Docker Compose 配置好了。使用 `docker compose up -d` 启动容器，接下来我们来配置 OpenLiteSpeed。

首先，使用以下命令设置一个密码（用于登录 OpenLiteSpeed 的 WebUI）

```bash
bash bin/webadmin.sh <YOUR_PASSWORD>
```

接下来，使用这个命令新建一个域名

```bash
bash bin/domain.sh -A <YOUR_DOMAIN>
```

再新建一个数据库

```bash
bash bin/database.sh -D <YOUR_DOMAIN>
```

执行完毕后，控制台会给出账号密码，记得妥善保存

然后安装 WordPress

```bash
./bin/appinstall.sh -A wordpress -D <YOUR_DOMAIN>
```

安装完毕之后，浏览器打开，然后正常安装 WordPress。如果你有数据需要迁移的话稍后会提到。

#### 2.2.1. 额外配置

如果你没有 ACME，也没有证书，你需要再安装一下 ACME。

使用以下命令安装

```bash
./bin/acme.sh -I -E <YOUR_EMAIL_ADDRESS>
```

然后使用这个命令申请证书

```bash
./bin/acme.sh -D <YOUR_DOMAIN>
```

### 2.3. WordPress

登录 WordPress 管理后台，在侧边栏找到 **LiteSpeed Cache**，找到 **Cache Rules**（缓存规则），点击上方的 **[6] 对象**（Object），修改成如图的设置

![](https://blog.ski.ink/wp-content/uploads/2025/05/image-56-1024x987.webp)

需要注意的是，下方的密码在我给出的修改版 Docker Compose 配置文件中有提到，如果你没设置密码（也就是 command 那行是注释的状态）则密码那行可以留空。

到这里，我们就把整个站点大多数的东西配置完了。

## 3. 简单的数据迁移

> [!WARNING]
> 我这里使用的方法是我第一直觉想出来的，肯定有些问题，照着学出问题自行负责，没那个技术力的话看看就好。

为了将上传的文件和插件迁移过去，我使用了一个骚操作：

在 `ols-wordpress/sites/<YOUR_DOMAIN>/html/wp-content` 这个地方有很多文件夹，其中插件、主题和上传的文件分别存储在 **plugins themes uploads** 三个文件夹中。

于是我就直接将这三个文件夹复制过来了，打开站点，乍一看似乎没问题，但是在进行一些操作的时候提示没权限。此时使用 `ls -l` 看了下权限，发现权限不一样，正常应该是这样的——

![](https://blog.ski.ink/wp-content/uploads/2025/05/image-57.webp)

我这里，**litespeed、object-cache.php** 两个文件属于一个叫 **debian** 的用户，想来是容器里头系统的用户。

既然没权限，那就 **chown** 呗。在 wp-content 下使用 `chown -R debian ./*` 解决问题，至此网站顺利迁移完毕。
