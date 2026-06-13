---
title: 'WordPress 维护：记录一次突发的入侵'
description: ''
pubDate: 2025-05-14T16:24:10.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/15.webp'
tags: [WordPress, 安全, 运维]
category: ''
---

<h2 class="wp-block-heading">0. 起因</h2>



<p>2025/5/14 晚上，我无聊死了正在玩 ATM9，QQ 突然收到一条消息。</p>



<p>点开 QQ 一看，是一条求助信息：</p>



<blockquote class="wp-block-quote">
<p>我进不去我wordpress后台了<br>账号密码不对<br>沟槽的</p>
</blockquote>



<p>这不来活了？于是马上挂游戏启动终端</p>



<h2 class="wp-block-heading">1. 排查可疑用户</h2>



<p>既然说是登陆不上去，那就先检查用户列表。可是 WordPress 都登录不上去了怎么检查呢？只能通过数据库控制台看了。</p>



<p>连上机器，执行命令，附加到容器上打开控制台，执行以下 SQL 语句——</p>



<pre class="wp-block-code"><code>mysql&gt; select ID, user_login, user_pass from wp_users;
+----+------------+-----------------------------------------------------------------+
| ID | user_login | user_pass                                                       |
+----+------------+-----------------------------------------------------------------+
|  1 | xxxxxxxx   | $wp$2y$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
|  2 | xxxxxxxx   | $wp$2y$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
|  3 | adm1nlxg1n | $wp$2y$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
+----+------------+-----------------------------------------------------------------+</code></pre>



<p>其中 <code>ID 1</code> 是我朋友的账号，<code>ID 2</code> 是我的账号，<code>ID 3</code> 是 <code>adm1nlxg1n</code>，一个很可疑的用户名，基本就可以确定是它了。</p>



<p>在此之前，先尝试一下使用我的账号登录。输入密码，发现也登录不上，于是确定整个站点的两个管理员账号都被修改了密码。</p>



<p>当务之急是恢复密码。执行 <code>UPDATE wp_users SET user_pass = MD5('password') WHERE ID = 1;</code> 先修改了密码，同时执行 <code>DELETE FROM wp_users WHERE ID = 3;</code> 删除了可疑用户。</p>



<h2 class="wp-block-heading">2. 进入站点，查看情况</h2>



<p>进入了管理界面，先检查一下是否有可疑的插件、文章是否被修改。经过一番检查，看似已经没有问题了——吗？</p>



<p>经验使我回过头去检查 <code>wp_users</code>。果不其然，那个神秘的用户再次出现了！</p>



<pre class="wp-block-code"><code>mysql&gt; select ID, user_login, user_pass from wp_users;
+----+------------+-----------------------------------------------------------------+
| ID | user_login | user_pass                                                       |
+----+------------+-----------------------------------------------------------------+
|  1 | xxxxxxxx   | $wp$2y$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
|  4 | adm1nlxg1n | $wp$2y$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
+----+------------+-----------------------------------------------------------------+</code></pre>



<p>能看到，ID 变为了 4，说明这是新增的一条记录。</p>



<p>目前看来，攻击者很可能在 WordPress 中留下了防止用户被删除的保活代码。既然是添加用户，肯定要提供用户名；既然要提供用户名，那就全局查找就好了。</p>



<pre class="wp-block-code"><code>root@xxxxxxxx:/xxx/wordpress# grep -rnw './' -e 'adm1nlxg1n'
./data/wp-content/themes/argon/functions.php:3231:    'user_login' =&gt; 'adm1nlxg1n',
./data/wp-content/plugins/xxxx/theme_tools.php:100:    'user_login' =&gt; 'adm1nlxg1n',
./data/wp-content/plugins/xxxx/theme_tools.php:128:            if ($admin-&gt;user_login === 'adm1nlxg1n') continue;</code></pre>



<p>果不其然，攻击者通过插入代码的方式添加了一个后门用户。那么，只要挨个排查上面的文件就好了。</p>



<h2 class="wp-block-heading">3. 检查恶意代码</h2>



<p>首先是来自 <strong>Argon</strong> 主题的 <code>functions.php</code>。考虑到 Argon 是一款开源的主题，我朋友又是从 GitHub 下载的主题，因此不太可能是 Argon 自身携带的恶意代码。</p>



<p>既然不太可能是 Argon 自带的，那就说明这段代码很可能是从别的地方插入而来。</p>



<p>除了 Argon 的 <code>functions.php</code>，还有两处查出字符串 <code>adm1nlxg1n</code>。这两处都是在一个名为 <code>xxxx</code> 的插件的 <code>theme_tools.php</code>。插件名称看着就很可疑，于是重点分析这段。</p>



<p>打开插件目录，发现整个插件只有一个文件，其中包含了百余行代码。由于代码不方便完整放出，于是对代码进行一些处理。</p>



<pre class="wp-block-code"><code>&lt;?php
/*
Plugin Name: Theme Tools
Description: Theme WordPress plugin.
Version: 1.0
Author: WordPress Helper
*/

register_activation_hook(__FILE__, 'theme_tools_activate');
add_action('init', 'theme_tools_run');
add_action('shutdown', 'theme_tools_cleanup');

function theme_tools_activate() {
    // 被抹除的关键代码
}

function twentytwenty_set_alter_five() {
    // 被抹除的关键代码
}

function theme_tools_run() {
    if (!get_option('theme_tools_should_run')) return;

    $theme_functions_file = get_template_directory() . '/functions.php';
    $marker = '// Theme Tools';
    if (file_exists($theme_functions_file) &amp;&amp; strpos(file_get_contents($theme_functions_file), $marker) === false) {

        // 被抹除的关键代码

        $code_to_add = &lt;&lt;&lt;PHP

$marker
// 被抹除的关键代码
PHP;
        file_put_contents($theme_functions_file, $code_to_add, FILE_APPEND);
    }

    if (!get_option('theme_tools_stage2') &amp;&amp; get_option('theme_tools_stage1')) {
        // 被抹除的关键代码
    }
}

function theme_tools_cleanup() {
    // 被抹除的关键代码
}
?&gt;</code></pre>



<p>可以看到，这段代码将一段内编码的字符串注入到当前主题的 <code>functions.php</code>，然后更改了除了 <code>adm1nlxg1n</code> 之外的所有管理员账户的密码为一个随机值。保护 <code>adm1nlxg1n</code> 账户不被删除的代码被注入到了 <code>functions.php</code> 并且在那里执行。</p>



<p>同时，这个插件还进行了一些基本的隐藏操作，包括但不限于——</p>



<ul class="wp-block-list">
<li>修改用户查询以排除隐藏用户</li>



<li>篡改用户统计数显示</li>



<li>阻止编辑/删除隐藏用户</li>
</ul>



<p>隐藏用户的密码并不是一个随机值，而是对站点域名进行一些运算得出来的一个定值（在这段代码中使用 <code>twentytwenty_set_alter_five()</code> 方法生成密码）。只要站点域名不发生变化，攻击者就可以获取到站点的访问权限。</p>



<p>这个插件还利用了 <code>shutdown</code> 钩子，使得插件在 PHP 退出时会删除所有有关痕迹以隐藏入侵</p>



<pre class="wp-block-preformatted">function theme_tools_cleanup() {<br>  delete_option('theme_tools_should_run');<br>  delete_option('theme_tools_stage1');<br>  delete_option('theme_tools_stage2');<br><br>  deactivate_plugins($plugin_file, true);<br>  delete_plugins([$plugin_file]);<br>  @unlink(__FILE__);<br>}</pre>



<h2 class="wp-block-heading">4. 善后及亡羊补牢</h2>



<p>删除了可疑插件及注入的代码，目前来看是没有什么问题了。</p>



<p>回顾一下整个流程，发现一些有意思的点——</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading">4.1. 为什么那么巧？</h3>



<div class="wp-block-group">
<figure class="wp-block-image size-full is-resized"><a href="https://blog.ski.ink/wp-content/uploads/2025/05/image-77.webp"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-77.webp" alt="" class="wp-image-629" style="width:259px;height:auto"/></a></figure>



<div class="wp-block-group">
<p>查看了我自己站点的通知，发现在朋友站点被入侵并发现前的一天，我的站点上朋友的账号被成功登录。很巧的是，这两个账号的用户名、密码相同。</p>



<p>攻击者在我的站点登录这个账号时并没有常见的“试错”环节，而是直截了当地输入了正确的账号和密码成功登录。</p>



<p>只是，我的站点强制启用了 2FA，攻击者没有账号的 2FA 验证代码，虽然显示为登录成功，但他们很可能没有获取到访问权限。</p>



<p>并且，我的站点启用了 <code>DISALLOW_FILE_EDIT</code>，即使攻击者成功登录，也无法创建插件插入代码。</p>
</div>
</div>



<p>根据上述发现，我有理由怀疑，攻击者认识我或我的朋友，且已经知道了部分个人信息（如朋友账号的密码）。朋友的站点未启用 2FA 且未启用 <code>DISALLOW_FILE_EDIT</code>，这给攻击者提供了契机。</p>



<h3 class="wp-block-heading">4.2. 为什么你是源站直通？</h3>



<div class="wp-block-group">
<figure class="wp-block-image size-full is-resized"><a href="https://blog.ski.ink/wp-content/uploads/2025/05/image-78.webp"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-78.webp" alt="" class="wp-image-630" style="width:421px;height:auto"/></a></figure>



<p>找到提供服务器的朋友，拜托他查询了攻击我的站点和我朋友的站点的 IP，得到的回复如图。</p>
</div>



<blockquote class="wp-block-quote">
<p></p>
</blockquote>



<p>根据结果，攻击者绕开了 CDN，直接访问了源站，且攻击者 IP 所在的整个 IP 段都是恶意 IP。</p>



<p>后经过查询，得知 IP 属于服务商 <strong>PlainProxies</strong>，是一家 VPN 提供商。也就是说，攻击者是通过 VPN 进行的攻击，我们获取到的并不是他的实际 IP。</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p>整个事件告一段落，朋友准备重装 WordPress，而我也在分析 MySQL 的 binlog，尝试找出些有用的信息。</p>



<p>从这次事件中可以看出，WordPress 作为一个老牌的博客软件，它虽然强大，但是若使用不当，很可能将整个站点暴露于危险之中。</p>



<p>因此，<strong>设定一个复杂的强密码</strong>、<strong>启用 2FA</strong>、<strong>定期轮换密码</strong>这些操作看似不必要，却能够实实在在地保护你的站点。</p>