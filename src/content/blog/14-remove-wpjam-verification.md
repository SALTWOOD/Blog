---
title: '如何彻底干掉 WPJAM 的公众号验证码'
description: ''
pubDate: 2025-04-13T13:52:12.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/14.webp'
tags: [WordPress, WPJAM, 破解]
category: ''
---

> [!WARNING]
> 本篇文章仅作记录使用。我尝试去掉验证码是因为**每隔一段时间就得重新验证一次嫌烦**，**并不是因为不支持作者**。  
> 如果作者看到这篇文章认为我侵犯了你的权益，请**直接在下方评论区告诉我**，我会**删除文章**。

## 0. 起因

本来我发现 WPJAM 很好用，高高兴兴地去做了个验证，就以为高枕无忧了，结果过了段时间发现插件提供的功能都禁用了，一看是验证失效，需要我重新验证。

本来很好的一个插件，却因为反复验证，搞得我心烦意乱，于是决定扒扒源代码直接把验证干掉

## 1. 探索

[![](https://static.ski.ink/old-blog/uploads/2025/05/image-73.webp)](https://static.ski.ink/old-blog/uploads/2025/05/image-73.webp)

当我第八次看到这个页面的时候我绷不住了，于是直接启动 VSCode 连到远端服务器开始研究。

首先我想的当然是直接全局搜索页面上显示的文字，于是使用这条命令搜索了整个 `wpjam-basic` 文件夹：

```bash
grep -rnw './' -e '验证'
```

得到结果如下：

```
root@localhost:/opt/blog/wp-content/plugins/wpjam-basic# grep -rnw './' -e '验证'
./includes/class-wpjam-field.php:543:                           if($value || is_array($value) || is_numeric($value)){   // 空值只需 required 验证
./components/wpjam-admin.php:244:                       'submit_text'   => '验证',
./components/wpjam-admin.php:281:                                       'page_title'    => '验证 WPJAM',
```

挨个排查上面三个结果，发现在 `components/wpjam-admin.php` 的第 265 行开始就是验证的逻辑：

```php
<?php
public static function on_admin_init(){
	$menu_page	= wpjam_get_item('menu_page', 'wpjam-basic');
	if(get_transient('wpjam_basic_verify')){
		if($menu_page){
			wpjam_set_item('menu_page', 'wpjam-basic', wpjam_except($menu_page, 'subs.wpjam-about'));
		}
	}elseif(self::verify()){
		if(isset($_GET['unbind_wpjam_user'])){
			delete_user_meta(get_current_user_id(), 'wpjam_weixin_user');
			wp_redirect(admin_url('admin.php?page=wpjam-verify'));
		}
	}else{
		if($menu_page && isset($menu_page['subs'])){
			$menu_page['subs']	= wpjam_pick($menu_page['subs'], ['wpjam-basic'])+['wpjam-verify'=> [
				'parent'		=> 'wpjam-basic',
				'order'			=> 3,
				'menu_title'	=> '扩展管理',
				'page_title'	=> '验证 WPJAM',
				'function'		=> 'form',
				'form'			=> [self::class, 'get_form']
			]];
			wpjam_set_item('menu_page', 'wpjam-basic', $menu_page);
		}
	}
}
?>
```

在此处的 else 正是我查找到关键词。向上看一看 if 的判断条件，发现是检查是否有一个名为 `wpjam_basic_verify` 的 transient，如果有就设置 item。

虽然不知道这里的 item 是什么用，但是看到了下面有一个 else if，看里头的逻辑应该是检查是否设定了查询字符串中的 `unbind_wpjam_user`，如果设定了就删除名为 `wpjam_weixin_user` 的 user meta。

既然都扯到微信了，上面的验证又是通过关注公众号获取验证码进行的，就不得不怀疑最前面那个 if 就是判断成功之后的操作。于是把 if 的判断条件改为常量 true

```php
<?php
public static function on_admin_init(){
	$menu_page	= wpjam_get_item('menu_page', 'wpjam-basic');
	if(true){//get_transient('wpjam_basic_verify')){
		if($menu_page){
			wpjam_set_item('menu_page', 'wpjam-basic', $menu_page);//, wpjam_except($menu_page, 'subs.wpjam-about'));
		}
	}/*elseif(self::verify()){
		if(isset($_GET['unbind_wpjam_user'])){
			delete_user_meta(get_current_user_id(), 'wpjam_weixin_user');
			wp_redirect(admin_url('admin.php?page=wpjam-verify'));
		}
	}else{
		if($menu_page && isset($menu_page['subs'])){
			$menu_page['subs']	= wpjam_pick($menu_page['subs'], ['wpjam-basic'])+['wpjam-verify'=> [
				'parent'		=> 'wpjam-basic',
				'order'			=> 3,
				'menu_title'	=> '扩展管理',
				'page_title'	=> '验证 WPJAM',
				'function'		=> 'form',
				'form'			=> [self::class, 'get_form']
			]];
			wpjam_set_item('menu_page', 'wpjam-basic', $menu_page);
		}
	}*/
}
?>
```

[![](https://static.ski.ink/old-blog/uploads/2025/05/image-76.webp)](https://static.ski.ink/old-blog/uploads/2025/05/image-76.webp)

由于 PHP 不用编译什么的，直接保存就能看到效果。于是我跑到 `/wp-admin` 去一看，下面少了一个**关于 WPJAM**。

虽然说只是一个关于页面，并不影响正常使用，但是把人家作者的信息删了也有点过意不去。

于是回顾前面那一段代码，发现在第一个 if 中通过 `wpjam_except` 把关于页面去掉了。于是直接把 `$menu_page` 传了进去，发现关于页面的选项正常出现了。

至此，移除验证方法的探索到此结束。

## 2. 后续

由于整个插件的大部分功能是需要验证才能使用的，但是我并不清楚这些功能在验证失效之后是否必须重新验证才会正常工作。于是我再仔细看了看代码——

```
root@localhost:/opt/blog/wp-content/plugins/wpjam-basic# grep -rnw './' -e 'wpjam_basic_verify'
./components/wpjam-admin.php:265:               if(true){//get_transient('wpjam_basic_verify')){
```

通过搜索发现整个验证逻辑只是调用 `get_transient('wpjam_basic_verify')`，并没有将判断结果存储到某个变量，同时其他部分代码中也没有在调用这个方法检查是否通过验证，因此也就可以判断，已经打开的功能在验证失效之后不会停止工作，换句话说就是把设置界面挖掉了而已。
