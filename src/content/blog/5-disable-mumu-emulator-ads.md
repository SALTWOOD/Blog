---
title: '如何关闭 MuMu 模拟器弹窗广告'
description: ''
pubDate: 2025-02-21T13:45:48.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/5.webp'
tags: [安卓, 模拟器, 去广告]
category: ''
---

<h2 class="wp-block-heading">0. 起因</h2>



<p>MuMu 模拟器我一直在用，可以说整体上<em>除了有些广告之外</em>很不错。</p>



<p>一天，我后台挂着模拟器，突然电脑右下角来个弹窗。此前 MuMu 模拟器<strong>并没有电脑桌面的弹窗广告</strong>，估计是某个版本更新之后加的。</p>



<p>模拟器桌面的弹窗广告经常不小心点到然后自动安装、消息中心小红点都忍了，但是电脑桌面弹窗真的不能忍。于是简单总结一下怎么干掉这些广告。</p>



<h2 class="wp-block-heading">1. 屏蔽内部桌面广告</h2>



<p>桌面广告内置于一个包名为 <code>com.mumu.launcher_new</code> 的系统软件中。这个软件同时也是模拟器桌面，因此显然不能通过直接删除这个软件的方式来关闭广告。</p>



<ol class="wp-block-list">
<li>下载旧版本桌面：<a href="https://ski.ink/static/files/com.mumu.launcher_new.apk">此处</a>或<a href="https://wwre.lanzouq.com/ibbgZ27aapkf">备用蓝奏云链接</a>（密码 2mrs，来自 <a href="https://www.bilibili.com/opus/830791956620640309">MuMu12 开屏广告与桌面广告的简单解决办法</a>）</li>



<li>进入模拟器设置 → 磁盘 → 启用<strong>可写系统盘</strong></li>



<li>通过 ADB 或内置文件管理器找到 <code>/system/priv-app/com.mumu.launcher_new/com.mumu.launcher_new.apk</code></li>



<li>将下载下来的旧版本桌面软件 APK 重命名为 <code>com.mumu.launcher_new.apk</code>，然后替换，如图。</li>
</ol>



<figure class="wp-block-image size-full is-resized"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-21.webp" alt="" class="wp-image-571" style="width:661px;height:auto"/></figure>



<h3 class="wp-block-heading">1.2 替换文件后的异常处理</h3>



<p>替换完成后，<strong>几乎百分百</strong>会出现如图所示的提示。</p>



<figure class="wp-block-image size-full is-resized"><a href="https://blog.ski.ink/wp-content/uploads/2025/05/image-23.webp"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-23.webp" alt="" class="wp-image-573" style="width:670px;height:auto"/></a></figure>



<p>这个问题也很好解决，点击<strong>应用信息</strong> → <strong>存储</strong>，然后清除 <strong>Mumu Launcher</strong> 的数据就好了。</p>



<p>如果清除之后还是出现弹窗，就清除<strong>游戏中心</strong>的数据，然后<strong>再清除一遍 Mumu Launcher 的数据</strong>。</p>



<h2 class="wp-block-heading">2. 屏蔽桌面弹窗广告</h2>



<p>通过火绒的截图拦截可以发现弹窗程序名叫 <strong>MuMuPlayerService.exe</strong>，双击打开没有什么作用，删掉似乎也不影响使用。于是解决方案呼之欲出——</p>



<blockquote class="wp-block-quote">
<p>删除 MuMu 安装路径下的 <strong><code>MuMuPlayerService.exe</code></strong>，然后<strong><strong>新建同名文件夹替代</strong></strong>（<strong>一定是文件夹</strong>）。</p>
</blockquote>



<h2 class="wp-block-heading">3. 屏蔽开屏广告</h2>



<p>这个其实还好，但是既然写了这文章也一并给出。</p>



<blockquote class="wp-block-quote">
<p>打开 <strong><code>%APPDATA%\Netease\MuMuPlayer-12.0\data</code></strong>，删掉一个名叫 <strong><code>startupImage</code></strong> 的<strong>文件夹</strong>，<strong>新建一个同名文件</strong>（<strong>一定是文件</strong>）。</p>
</blockquote>



<p>这样做可以阻止 MuMu 模拟器联网下载开屏广告图，就不会显示开屏广告了。如果你想自定义开屏图片也可以尝试修改这里头的文件，只是这篇文章不作记述。</p>



<h2 class="wp-block-heading">4. 屏蔽消息中心</h2>



<p>通过流量分析可得知，提供消息中心通知推送服务的域名是 <strong>mumu.nie.netease.com</strong>。于是只需要在 Hosts 中屏蔽这个域名就好了。</p>



<ol class="wp-block-list">
<li>按 <strong>Ctrl + Shift + Esc</strong> 打开任务管理器</li>



<li>选择<strong>运行新任务</strong>，勾选下方的“<strong>以系统管理权限创建此任务</strong>”</li>



<li>在输入框输入 <code>notepad C:\Windows\System32\drivers\etc\hosts</code>，按确定</li>



<li>找一个空闲的地方，换行，输入以下内容，然后按 <strong>Ctrl + S</strong> 保存，关掉记事本</li>
</ol>



<pre class="wp-block-code"><code>0.0.0.0 mumu.nie.netease.com</code></pre>



<h2 class="wp-block-heading">5. Conclusion</h2>



<p>通过以上这四步，就能关闭模拟器内绝大多数广告了。如果你发现上文记述的方法失效、出现了新的广告什么的，可以在讨论区留言。</p>