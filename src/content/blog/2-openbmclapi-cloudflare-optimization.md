---
title: '使用 Cloudflare 优选为 OpenBMCLAPI 助力'
description: ''
pubDate: 2025-02-17T11:33:11.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/2.webp'
tags: [Cloudflare, Minecraft, 教程]
category: ''
---

> [!NOTE]
> 此篇文章含有较多的图片，因此不适合在移动网络环境或卡顿的网络环境下阅读。

> [!WARNING]
> **优选 IP 违反 Cloudflare 的协议，使用优选 IP 可能导致域名被列入黑名单，无法使用 Cloudflare 提供的服务。**  
> **按照本文的教程操作导致域名被封禁与本人无关，本文仅对优选 IP 的原理进行技术性记述，本人不鼓励使用优选 IP。**

> [!NOTE]
> 作者**并不实际拥有** `example.com` 和 `example.top`，因此文中的图片经过浏览器开发工具修改，**仅作演示**。

## 0. 前言

众所周知，Cloudflare 被称为"赛博大善人"，因其提供许多好用的免费功能，其中就包括"小黄云"。  
但是，由于 Cloudflare 大多数节点位于国外，其对国内访问的速度也并不友好。于是，就有神人想到了"优选 IP"这一个骚操作。  
这篇文章旨在介绍优选 IP 的原理以及通过优选 IP 部署 OpenBMCLAPI 节点。

## 1. 申请节点

本篇文章不再赘述，请参见本人的其他文章。

## 2. Cloudflare 配置

在节点申请成功、同步完所有文件之后，按照以下步骤操作：

### 2.1. 购买、绑定域名

你一共需要**两个域名**来完成此操作。这里我使用 `example.com` 和 `example.top` 代称这两个域名。

> [!NOTE]
> 你也可以选择在 Cloudflare 购买 `example.com`，但是必须有另一个不由 Cloudflare 管理的域名（此例是 `example.top`）  
> 如果你在 Cloudflare 购买了一个域名，你可以跳过此步。

首先，先将 `example.com` 添加至 Cloudflare。在 [https://dash.cloudflare.com/](https://dash.cloudflare.com/) 注册你的账号，然后点击**添加域**。

![](https://static.ski.ink/blog-uploads/2/images/1.webp)

此时你会看到这样一个这样的界面，输入 `example.com`，点击继续。

![](https://static.ski.ink/blog-uploads/2/images/2.webp)

此处有四个计划，分别是 **Pro, Business, Enterprise, Free**。如果你是富哥可以选别的，但是 Free 在我们的需求下就够用了。

配置完成后，会显示如下的页面：

![](https://static.ski.ink/blog-uploads/2/images/3.webp)

此处，Cloudflare 提供给我们两个 DNS 服务器，我这里是 `brenna.ns.cloudflare.com` 和 `craig.ns.cloudflare.com`。将这两个 DNS 服务器替换到你的域名购买处，如图：

![](https://static.ski.ink/blog-uploads/2/images/4.webp)

很棒！现在，`example.com` 成功地被你托管到了 Cloudflare 上，接下来还需要一个 `example.top`，但由于它不需要（也不能）托管到 Cloudflare 上，所以你随便在阿里云或者别的地方买一个就行了。

### 2.2. 配置自定义主机名

**自定义主机名（SaaS）**可以将另一个域名"映射"到你的域名（回退源）。配置自定义主机名之后，访问自定义主机名域名实际访问的是回退源域名。与 CNAME 不同的是，自定义主机名经过 Cloudflare 代理流量，Cloudflare 会为客户自动处理 SSL 证书，不需要自己部署两个证书。

简单来说就是一个映射。为啥要这么干呢？我也不知道捏。

首先，先新建一个 DNS 解析，指向你的源站。我这里新建了 `origin.example.com` 到 `example.com` 的解析。**记得开小黄云**！你在新建解析的时候右侧有个"代理状态"开关，把它点成这个样子就是开了。

![](https://static.ski.ink/blog-uploads/2/images/5.webp)

> [!NOTE]
> 由于我也不知道什么原因，开启 SaaS 需要绑定付款方式，即使后面可以选择 Free 计划……  
> 付款方式要银行卡或者 PayPal，没有的可以走了，记得回退更改。

然后，进入 `example.com` 的管理界面，依次点击 **SSL/TLS**、**自定义主机名**，然后设置回退源为 `origin.example.com`。

![](https://static.ski.ink/blog-uploads/2/images/6.webp)

接下来，点击上方的**添加自定义主机名**按钮，输入你那个不由 Cloudflare 管理的域名的一个子域。我这里使用 `example.top`，其他配置按照默认，如图这样。

![](https://static.ski.ink/blog-uploads/2/images/7.webp)

接下来，转到 `example.top` 的解析管理页面，添加如下解析：

`_acme-challenge.example.top` **CNAME** `example.top.0000000000000000.dcv.cloudflare.com`

你也可以选择使用 TXT 记录，但是 DCV 委派方便且无需担心到期。

添加之后，等待自定义主机名生效。

![](https://static.ski.ink/blog-uploads/2/images/8.webp)

### 2.3. 配置辅助域名

上面我们已经成功地将 `example.top` 作为一个自定义主机名添加到了 Cloudflare，接下来我们需要配置辅助域名，使其解析至优选 IP。这边**我再叠一次甲**：

> [!WARNING]
> **优选 IP 违反 Cloudflare 的协议，使用优选 IP 可能导致域名被列入黑名单，无法使用 Cloudflare 提供的服务。**  
> **按照本文的教程操作导致域名被封禁与本人无关，本文仅对优选 IP 的原理进行技术性记述，本人不鼓励使用优选 IP。**

好，让我们转到 `example.top`。添加如图所示的解析：

![](https://static.ski.ink/blog-uploads/2/images/9.webp)

这样子，访问 `example.top` 的时候，会被 CNAME 到优选过的 Cloudflare 代理节点，然后经过前文配置的自定义主机名，就会最终回到源站。

此时我们访问 `example.top`，应该会看到类似这样的页面：

![](https://static.ski.ink/blog-uploads/2/images/10.webp)

![](https://static.ski.ink/blog-uploads/2/images/11.webp)

看到这两个页面的其中一个，就说明你配置正确了，接下来需要配置 **Origin Rules** 和 **Cache Rules**。

> [!NOTE]
> 如果你的节点本来的访问地址就是 443 端口，不需要加端口号就能访问的话，可以只配置 **Cache Rules**。

### 2.4. 配置 Origin Rules 和 Cache Rules

接下来，转到 `example.com` 的管理页面，点击**规则**，找到 **Origin Rules** 和 **Cache Rules**，分别按如下添加：

#### Origin Rules

选择**自定义筛选表达式**，然后点击**编辑表达式**，输入如下内容：

```
(http.host wildcard "example.top")
```

然后滑到下面，选择**目标端口** => **重写到…**，输入你的 OpenBMCLAPI 节点的**外部访问端口**，保存规则，启用。

#### Cache Rules

选择**自定义筛选表达式**，然后点击**编辑表达式**，输入如下内容：

```
(http.request.full_uri wildcard "https://example.top/download/*")
```

**缓存资格**：***符合缓存条件***

**边缘 TTL**："***忽略缓存控制标头，使用此 TTL***"，然后选择**一年**（随你便，但反正都是基于哈希的请求路径，所以不用担心更新文件导致错乱）

**浏览器 TTL**："***替代源服务器，使用此 TTL***"，然后也是一年

**缓存密钥**：打开"***忽略查询字符串***"，很重要！不打开会缓存不上！

## 3. 配置 OpenBMCLAPI 节点

帅！配置完 **Origin Rules** 和 **Cache Rules** 之后，我们成功地搞定了优选 IP 的部分，接下来就是配置我们的节点了。

这是我的节点配置，你可以参考：

```
CLUSTER_ID=xxxxxxxxxxxxxxxxxxxxxxxx
CLUSTER_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLUSTER_PORT=4001 #此处是你在 Origin Rules 中设置的重写端口
CLUSTER_PUBLIC_PORT=443
CLUSTER_IP=example.top
CLUSTER_BYOC=true
SSL_CERT=/path/to/your/cert/cert.pem
SSL_KEY=/path/to/your/cert/key.pem # 此处证书是你设置的源站的，也就是 example.com，上文开启小黄云的那个解析的解析目标
DISABLE_ACCESS_LOG=true
```

然后，启动节点，等待一段时间，Cloudflare 将文件缓存得差不多了之后（表现为云耀斑仪表盘显示的请求很多，但每次 Keep-Alive 才上报几个兆的流量和不超过两位数的请求，具体凭个人感觉），就可以找 **bangbang93** 将你的节点标记为 **CDN** 了。

## 4. 成果展示

![](https://static.ski.ink/blog-uploads/2/images/12.webp)

![](https://static.ski.ink/blog-uploads/2/images/13.webp)

大概就是这样的效果，当然你别拿晚上的和高峰期的比。

## 5. 友情鸣谢

[Cloudflare 优选部署指南 - 零狼 の 小窝](https://zerowolf.cn/2025/02/cf%e4%bc%98%e9%80%89/) —— 要是没看到这篇文章我都想不起来要写这玩意（
