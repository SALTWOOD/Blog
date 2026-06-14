---
title: '基于 Cap 的 WordPress Argon 评论发送验证码'
description: ''
pubDate: 2025-07-07T14:05:20.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/16.webp'
tags: [WordPress, 安全, 验证码]
category: ''
---

> [!WARNING]
> 本文记述的修改办法极其粗糙，有待优化，仅作概念验证  
> 如需实际使用，要修改人机验证组件的样式、对后端进行限制等

## 0. 起因

之前无聊死了，去翻了翻 Argon 主题的代码，发现后端居然没有对发送评论时的验证码进行验证。也就是说，**Argon 主题的评论验证码是前端的**。

[![Argon 评论验证码图例](https://static.ski.ink/blog-uploads/2025/07/image.webp)](https://static.ski.ink/blog-uploads/2025/07/image.webp)

于是打开 F12 扒了一下请求，直接丢进 Python 重放，居然能过，意味着验证码根本没有起到任何作用。

[![Python 重放评论请求](https://static.ski.ink/blog-uploads/2025/07/image-1.webp)](https://static.ski.ink/blog-uploads/2025/07/image-1.webp)

[![重放评论效果图](https://static.ski.ink/blog-uploads/2025/07/image-2.webp)](https://static.ski.ink/blog-uploads/2025/07/image-2.webp)

要知道，验证这种东西做在前端，这么一个无用的验证码除了发评论的时候烦一下人，没有任何作用。

## 1. 尝试魔改

无意中看到玄离的一期视频，看到她提到一个叫 **Cap** 的项目。

[GitHub](https://github.com/)

[tiagorangel1/cap](https://github.com/tiagorangel1/cap)

准确说，Cap 并不是通过各种特征来进行人机验证，而是通过 **PoW (Proof of Work)**，使用用户的浏览器**进行一些数学计算**，通过**消耗算力**的方式提升攻击者的攻击成本以减少恶意请求。

于是就简单研究了一下 Argon，进行了一些魔改

## 2. 成品

我个人不喜欢废话，于是就把使用方法贴在这里：

把这一段加到 argontheme.js 去

```
window.capVerificationToken = null;
$("#post_comment_captcha").on("solve", function(e) {
	window.capVerificationToken = e.detail.token;
});
if ($("#post_comment").hasClass("no-need-captcha")) {
	$("#post_comment_captcha").hide();
}
```

然后把 `postComment` 方法改成这样子

```
function postComment(){
	let commentContent = $("#post_comment_content").val();
	let commentName = $("#post_comment_name").val();
	let commentEmail = $("#post_comment_email").val();
	let commentLink = $("#post_comment_link").val();
	let commentCaptcha = window.capVerificationToken;
	let useMarkdown = false;
	let privateMode = false;
	let mailNotice = false;
	if ($("#comment_post_use_markdown").length > 0){
		useMarkdown = $("#comment_post_use_markdown")[0].checked;
	}
	if ($("#comment_post_privatemode").length > 0){
		privateMode = $("#comment_post_privatemode")[0].checked;
	}
	if ($("#comment_post_mailnotice").length > 0){
		mailNotice = $("#comment_post_mailnotice")[0].checked;
	}
	let postID = $("#post_comment_post_id").val();
	let isError = false;
	let errorMsg = "";
	//检查表单合法性
	if (commentContent.match(/^\s*$/)){
		isError = true;
		errorMsg += __("评论内容不能为空") + "</br>";
	}
	if (!$("#post_comment").hasClass("no-need-name-email")){
		if (commentName.match(/^\s*$/)){
			isError = true;
			errorMsg += __("昵称不能为空") + "</br>";
		}
		if ($("#post_comment").hasClass("enable-qq-avatar")){
			if (!(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/).test(commentEmail) && !(/^[1-9][0-9]{4,10}$/).test(commentEmail)){
				isError = true;
				errorMsg += __("邮箱或 QQ 号格式错误") + "</br>";
			}
		}else{
			if (!(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/).test(commentEmail)){
				isError = true;
				errorMsg += __("邮箱格式错误") + "</br>";
			}
		}
	}else{
		if (commentEmail.length || (document.getElementById("comment_post_mailnotice") != null && document.getElementById("comment_post_mailnotice").checked == true)){
			if ($("#post_comment").hasClass("enable-qq-avatar")){
				if (!(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/).test(commentEmail) && !(/^[1-9][0-9]{4,10}$/).test(commentEmail)){
					isError = true;
					errorMsg += __("邮箱或 QQ 号格式错误") + "</br>";
				}
			}else{
				if (!(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/).test(commentEmail)){
					isError = true;
					errorMsg += __("邮箱格式错误") + "</br>";
				}
			}
		}
	}
	if (commentLink != "" && !(/https?:\/\//).test(commentLink)){
		isError = true;
		errorMsg += __("网站格式错误 (不是 http(s):// 开头)") + "</br>";
	}
	if (!$("#post_comment").hasClass("no-need-captcha")){
		if (!window.capVerificationToken){
			isError = true;
			errorMsg += __("验证码未输入");
		}
	}
	if (isError){
		iziToast.show({
			title: __("评论格式错误"),
			message: errorMsg,
			class: 'shadow-sm',
			position: 'topRight',
			backgroundColor: '#f5365c',
			titleColor: '#ffffff',
			messageColor: '#ffffff',
			iconColor: '#ffffff',
			progressBarColor: '#ffffff',
			icon: 'fa fa-close',
			timeout: 5000
		});
		return;
	}
	//增加 disabled 属性和其他的表单提示
	$("#post_comment").addClass("sending");
	$("#post_comment_content").attr("disabled","disabled");
	$("#post_comment_name").attr("disabled","disabled");
	$("#post_comment_email").attr("disabled","disabled");
	$("#post_comment_captcha").attr("disabled","disabled");
	$("#post_comment_link").attr("disabled","disabled");
	$("#post_comment_send").attr("disabled","disabled");
	$("#post_comment_reply_cancel").attr("disabled","disabled");
	$("#post_comment_send .btn-inner--icon.hide-on-comment-editing").html("<i class='fa fa-spinner fa-spin'></i>");
	$("#post_comment_send .btn-inner--text.hide-on-comment-editing").html(__("发送中"));
	iziToast.show({
		title: __("正在发送"),
		message: __("评论正在发送中..."),
		class: 'shadow-sm iziToast-noprogressbar',
		position: 'topRight',
		backgroundColor: 'var(--themecolor)',
		titleColor: '#ffffff',
		messageColor: '#ffffff',
		iconColor: '#ffffff',
		progressBarColor: '#ffffff',
		icon: 'fa fa-spinner fa-spin',
		close: false,
		timeout: 999999999
	});
	$.ajax({
		type: 'POST',
		url: argonConfig.wp_path + "wp-admin/admin-ajax.php",
		dataType : "json",
		data: {
			action: "ajax_post_comment",
			comment: commentContent,
			author: commentName,
			email: commentEmail,
			url: commentLink,
			comment_post_ID: postID,
			comment_parent: replyID,
			cap_token: commentCaptcha,
			"wp-comment-cookies-consent": "yes",
			use_markdown: useMarkdown,
			private_mode: privateMode,
			enable_mailnotice: mailNotice
		},
		success: function(result){
			$("#post_comment").removeClass("sending");
			$("#post_comment_content").removeAttr("disabled");
			$("#post_comment_name").removeAttr("disabled");
			$("#post_comment_email").removeAttr("disabled");
			$("#post_comment_link").removeAttr("disabled");
			$("#post_comment_send").removeAttr("disabled");
			$("#post_comment_reply_cancel").removeAttr("disabled");
			$("#post_comment_send .btn-inner--icon.hide-on-comment-editing").html("<i class='fa fa-send'></i>");
			$("#post_comment_send .btn-inner--text.hide-on-comment-editing").html(__("发送"));
			$("#post_comment").removeClass("show-extra-input post-comment-force-privatemode-on post-comment-force-privatemode-off");
			if (!result.isAdmin){
				$("#post_comment_captcha").removeAttr("disabled");
			}
			//判断是否有错误
			if (result.status == "failed"){
				iziToast.destroy();
				iziToast.show({
					title: __("评论发送失败"),
					message: result.msg,
					class: 'shadow-sm',
					position: 'topRight',
					backgroundColor: '#f5365c',
					titleColor: '#ffffff',
					messageColor: '#ffffff',
					iconColor: '#ffffff',
					progressBarColor: '#ffffff',
					icon: 'fa fa-close',
					timeout: 5000
				});
				return;
			}
			//发送成功
			iziToast.destroy();
			iziToast.show({
				title: __("发送成功"),
				message: __("您的评论已发送"),
				class: 'shadow-sm',
				position: 'topRight',
				backgroundColor: '#2dce89',
				titleColor: '#ffffff',
				messageColor: '#ffffff',
				iconColor: '#ffffff',
				progressBarColor: '#ffffff',
				icon: 'fa fa-check',
				timeout: 5000
			});
			//插入新评论
			result.html = result.html.replace(/<img class='comment-sticker lazyload'(.*?)\/>/g, "").replace(/<(\/).noscript>/g, "");
			let parentID = result.parentID;
			if (parentID == "" || parentID == null){
				parentID = 0;
			}
			parentID = parseInt(parentID);
			if (parentID == 0){
				if ($("#comments > .card-body > ol.comment-list").length == 0){
					$("#comments > .card-body").html("<h2 class='comments-title'><i class='fa fa-comments'></i> " + __("评论") + "</h2><ol class='comment-list'></ol>");
				}
				if (result.commentOrder == "asc"){
					$("#comments > .card-body > ol.comment-list").append(result.html);
				}else{
					$("#comments > .card-body > ol.comment-list").prepend(result.html);
				}
			}else{
				if ($("#comment-" + parentID + " + .comment-divider + li > ul.children").length > 0){
					$("#comment-" + parentID + " + .comment-divider + li > ul.children").append(result.html);
				}else{
					$("#comment-" + parentID + " + .comment-divider").after("<li><ul class='children'>" + result.html + "</ul></li>");
				}
			}
			calcHumanTimesOnPage();
			//复位评论表单
			cancelReply();
			$("#post_comment_content").val("");
			$("#post_comment_captcha + style").html(".post-comment-captcha-container:before{content: '" + result.newCaptcha + "';}");
			$("#post_comment_captcha").val(result.newCaptchaAnswer);
			$("body,html").animate({
				scrollTop: $("#comment-" + result.id).offset().top - 100
			}, 500, 'easeOutExpo');
		},
		error: function(result){
			$("#post_comment").removeClass("sending");
			$("#post_comment_content").removeAttr("disabled");
			$("#post_comment_name").removeAttr("disabled");
			$("#post_comment_email").removeAttr("disabled");
			$("#post_comment_link").removeAttr("disabled");
			$("#post_comment_send").removeAttr("disabled");
			$("#post_comment_reply_cancel").removeAttr("disabled");
			$("#post_comment_send .btn-inner--icon.hide-on-comment-editing").html("<i class='fa fa-send'></i>");
			$("#post_comment_send .btn-inner--text.hide-on-comment-editing").html(__("发送"));
			$("#post_comment").removeClass("show-extra-input post-comment-force-privatemode-on post-comment-force-privatemode-off");
			if (!result.isAdmin){
				$("#post_comment_captcha").removeAttr("disabled");
			}
			iziToast.destroy();
			iziToast.show({
				title: __("评论发送失败"),
				message: __("未知原因"),
				class: 'shadow-sm',
				position: 'topRight',
				backgroundColor: '#f5365c',
				titleColor: '#ffffff',
				messageColor: '#ffffff',
				iconColor: '#ffffff',
				progressBarColor: '#ffffff',
				icon: 'fa fa-close',
				timeout: 5000
			});
			return;
		}
	});
}
```

再替换掉 `functions.php` 中的 `ajax_post_comment` 方法，同时加上 cap_verify_token 方法

```php
<?php
function cap_verify_token($token)
{
    $response = wp_remote_post('https://<YOUR_CAP_ENDPOINT>', [
        'body' => [
            'secret' => '<YOUR_CAP_SECRET>',
            'response' => $token,
        ],
    ]);
    if (is_wp_error($response)) return false;
    $body = json_decode(wp_remote_retrieve_body($response));
    if (isset($body->success) && $body->success) return true;
    return false;
}
function ajax_post_comment(){
	$parentID = $_POST['comment_parent'];
	if (is_comment_private_mode($parentID)){
		if (!user_can_view_comment($parentID)){
			//如果父级评论是悄悄话模式且当前 Token 与父级不相同则返回
			exit(json_encode(array(
				'status' => 'failed',
				'msg' =>  __('不能回复其他人的悄悄话评论', 'argon'),
				'isAdmin' => current_user_can('level_7')
			)));
		}
	}
	if (get_option('argon_comment_enable_qq_avatar') == 'true'){
		if (check_qqnumber($_POST['email'])){
			$_POST['qq'] = $_POST['email'];
			$_POST['email'] .= "@qq.com";
		}else{
			$_POST['qq'] = "";
		}
	}
	if (get_option('argon_comment_need_captcha') && !cap_verify_token($_POST['cap_token'])) {
		exit(json_encode(array(
			'status' => 'failed',
			'msg' => __('人机验证失败', 'argon'),
			'isAdmin' => current_user_can('level_7')
		)));
	}
	$comment = wp_handle_comment_submission(wp_unslash($_POST));
	if (is_wp_error($comment)){
		$msg = $comment -> get_error_data();
		if (!empty($msg)){
			$msg = $comment -> get_error_message();
		}
		exit(json_encode(array(
			'status' => 'failed',
			'msg' => $msg,
			'isAdmin' => current_user_can('level_7')
		)));
	}
	$user = wp_get_current_user();
	do_action('set_comment_cookies', $comment, $user);
	if (isset($_POST['qq'])){
		if (!empty($_POST['qq']) && get_option('argon_comment_enable_qq_avatar') == 'true'){
			$_comment = $comment;
			$_comment -> comment_author_email = $_POST['qq'] . "@avatarqq.com";
			do_action('set_comment_cookies', $_comment, $user);
		}
	}
	$html = wp_list_comments(
		array(
			'type'      => 'comment',
			'callback'  => 'argon_comment_format',
			'echo'      => false
		),
		array($comment)
	);
	exit(json_encode(array(
		'status' => 'success',
		'html' => $html,
		'id' => $comment -> comment_ID,
		'parentID' => $comment -> comment_parent,
		'commentOrder' => (get_option("comment_order") == "" ? "desc" : get_option("comment_order")),
		'isAdmin' => current_user_can('level_7'),
		'isLogin' => is_user_logged_in()
	)));
}
add_action('wp_ajax_ajax_post_comment', 'ajax_post_comment');
add_action('wp_ajax_nopriv_ajax_post_comment', 'ajax_post_comment');
?>
```

找到 comments.php 里头的 `<div class="<?php echo $col3_class;?>">`，把它改成这样

```
<div class="<?php echo $col3_class;?>">
	<div class="form-group">
    	<cap-widget
    	    id="post_comment_captcha"
    	    data-cap-api-endpoint="https://<YOUR_CAP_ENDPOINT>">
    	</cap-widget>
	</div>
</div>
```

这样就能够给 Argon 接入 Cap 验证。
