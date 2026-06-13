---
title: 'PCL 反编译——加密和解密原理记录'
description: ''
pubDate: 2025-04-04T15:48:45.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/12.webp'
tags: []
category: ''
---

<div class="wp-block-argon-alert alert" style="background-color:#4fd69c"><span class="alert-inner--icon"><i class="fa fa-check"></i></span><span class="alert-inner--text">这篇文章去除了 PCL 加解密的核心代码，仅保留无关紧要的调用和工具类的整体框架。不要想着靠这篇文章去搞主题啦！</span></div>



<div class="wp-block-argon-alert alert" style="background-color:#ffa436"><span class="alert-inner--icon"><i class="fa fa-info-circle"></i></span><span class="alert-inner--text">秋仪金部分使用了 RSA，除非你偷到了龙猫的私钥或者暴力破解，否则是没有机会绕过爱发电打钱这一步的。死心吧！</span></div>



<div class="wp-block-argon-alert alert" style="background-color:#f75676"><span class="alert-inner--icon"><i class="fa fa-times-circle"></i></span><span class="alert-inner--text">为什么要和谐掉核心代码呢？我可不想被龙猫夹~</span></div>



<h2 class="wp-block-heading">0. 起因</h2>



<p>在 Google 上搜 "PCL" 找到<a href="https://www.luogu.com/article/ughew4si">一篇文章</a>，通过对 PCL 旧版泄露源码和非法魔改测试版的反编译，验证了这篇文章部分的事实。</p>



<p>但也仅限于部分，反编译的代码只能确定有同名的方法，却不能确定方法内部实现是否相同。</p>



<p>同时，那篇文章只贴出了 PCL 加解密的部分代码，抠掉了重要的部分，于是对 PCL 的加解密产生了兴趣的我开始尝试反编译 PCL 的测试版。</p>



<h2 class="wp-block-heading">1. 直接尝试反编译</h2>



<p>既然 PCL 是用 Visual BASIC 编写的，那么肯定基于 .NET。<br>既然基于 .NET，那就可以请出我们的 .NET 反编译大神——<a href="https://github.com/icsharpcode/ILSpy">ILSpy</a>。</p>



<p>但是，在把测试版的 PCL 拖进 ILSpy 之后，却发现无法解析——</p>



<figure class="wp-block-image size-large"><a href="https://blog.ski.ink/wp-content/uploads/2025/05/image-69.webp"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-69-1024x230.webp" alt="" class="wp-image-621"/></a></figure>



<p>经过一番研究和询问龙猫，得知 PCL 测试版是经过加壳的，需要先脱壳再反编译才可能得到代码。</p>



<h2 class="wp-block-heading">2. 尝试脱壳</h2>



<p>在 GitHub 搜索过后，我找到了两个项目</p>



<div class="wp-block-argon-github github-info-card card shadow-sm github-info-card-full" data-author="void-stack" data-project="VMUnprotect.Dumper"><div class="github-info-card-header"><a href="https://github.com/" target="_blank" title="Github" rel="noopener"><span><i class="fa fa-github"></i> GitHub</span></a></div><div class="github-info-card-body"><div class="github-info-card-name-a"><a href="https://github.com/void-stack/VMUnprotect.Dumper" target="_blank" rel="noopener"><span class="github-info-card-name">void-stack/VMUnprotect.Dumper</span></a></div><div class="github-info-card-description"></div></div><div class="github-info-card-bottom"><span class="github-info-card-meta github-info-card-meta-stars"><i class="fa fa-star"></i> <span class="github-info-card-stars"></span></span><span class="github-info-card-meta github-info-card-meta-forks"><i class="fa fa-code-fork"></i> <span class="github-info-card-forks"></span></span></div></div>



<div class="wp-block-argon-github github-info-card card shadow-sm github-info-card-full" data-author="SychicBoy" data-project="NETReactorSlayer"><div class="github-info-card-header"><a href="https://github.com/" target="_blank" title="Github" rel="noopener"><span><i class="fa fa-github"></i> GitHub</span></a></div><div class="github-info-card-body"><div class="github-info-card-name-a"><a href="https://github.com/SychicBoy/NETReactorSlayer" target="_blank" rel="noopener"><span class="github-info-card-name">SychicBoy/NETReactorSlayer</span></a></div><div class="github-info-card-description"></div></div><div class="github-info-card-bottom"><span class="github-info-card-meta github-info-card-meta-stars"><i class="fa fa-star"></i> <span class="github-info-card-stars"></span></span><span class="github-info-card-meta github-info-card-meta-forks"><i class="fa fa-code-fork"></i> <span class="github-info-card-forks"></span></span></div></div>



<p>搭配 ILSpy 尝试了一下，用它们两个去旧测试版的 PCL 壳是没有问题的，只是代码被混淆了而已，但是去新测试版的壳却又出现了问题。</p>



<p>再次询问群友，得知龙猫最近更新了 PCL，使用了 .NET Reactor 的 6.5 版本，而这个版本<strong>目前没有脱壳的方法</strong>，反混淆倒是可以用 <strong>NETReactorSlayer</strong>。</p>



<h2 class="wp-block-heading">3. 转换思路</h2>



<p>虽然没法直接反编译新测试版的 PCL，但是我从群友那里得知并验证了一个信息：<strong>除了秋仪金主题相关的，其他部分的加密方式并没有更改过。</strong></p>



<p>于是我找来了<strong>旧测试版</strong>的 PCL，通过 <strong>VMUnprotect.Dumper</strong>，成功脱壳了 PCL 反编译了源码，获取到了那篇文章提及的 <code>GetHash</code> <code>StrFill</code> 和 <code>SecureKey</code> 三个方法，与原文中提供的 <code>SecureAdd</code> 和 <code>SecureRemove</code> 拼凑在一起，再去拿来密文和识别码，调用方法，成功解密出数据！</p>



<figure class="wp-block-image size-full is-resized"><a href="https://blog.ski.ink/wp-content/uploads/2025/05/image-72.webp"><img src="https://blog.ski.ink/wp-content/uploads/2025/05/image-72.webp" alt="" class="wp-image-624" style="width:840px;height:auto"/></a></figure>



<h2 class="wp-block-heading">4. 代码</h2>



<p>再经过一些优化和改进，我写出了这么一个类：</p>



<pre class="wp-block-code"><code>using System.Security.Cryptography;
using System.Text;

/// &lt;summary&gt;
/// 一个适用于 PCL 测试版的加解密助手类。
/// &lt;/summary&gt;
/// &lt;remarks&gt;
/// &lt;para&gt;
/// 通过 Encrypt 和 Decrypt 方法，可以生成或解密 PCL 同款加密方式的密文。&lt;br/&gt;
/// 注意：秋仪金主题使用 RSA 加密方式，此类无法处理，需获取龙猫的私钥。
/// &lt;/para&gt;
/// &lt;example&gt;
/// 使用示例：
/// &lt;code&gt;
/// var helper = new PCLSecretHelper("***AAAA-BBBB-CCCC-DDDD");
/// string encrypted = helper.Encrypt("*****************************");
/// string decrypted = helper.Decrypt("************");
/// &lt;/code&gt;
/// &lt;/example&gt;
/// &lt;/remarks&gt;
public class PCLSecretHelper
{
    /// &lt;summary&gt;初始化向量&lt;/summary&gt;
    ****** ***** ****** ** = **********;

    /// &lt;summary&gt;哈希计算初始值&lt;/summary&gt;
    ****** ***** *** ********* = ****;

    /// &lt;summary&gt;哈希计算异或值&lt;/summary&gt;
    ****** ***** ***** ******** = ********************;

    /// &lt;summary&gt;默认加密密钥&lt;/summary&gt;
    ****** ***** ****** *********** = **********;

    private readonly string _id;  // 启动器识别码

    /// &lt;summary&gt;
    /// 使用指定的启动器识别码初始化助手类
    /// &lt;/summary&gt;
    /// &lt;param name="id"&gt;形如 ***AAAA-BBBB-CCCC-DDDD 的识别码&lt;/param&gt;
    public PCLSecretHelper(string id)
    {
        _id = id;
    }

    /// &lt;summary&gt;
    /// 解密 Base64 编码的密文字符串
    /// &lt;/summary&gt;
    /// &lt;param name="source"&gt;Base64 编码的密文&lt;/param&gt;
    /// &lt;returns&gt;UTF8 编码的明文&lt;/returns&gt;
    public string Decrypt(string source)
    {
        string key = GetSecretKey(_id);
        byte&#91;] keyBytes = Encoding.UTF8.GetBytes(key);
        byte&#91;] ivBytes = Encoding.UTF8.GetBytes(IV);

        using (DES des = DES.Create())
        using (MemoryStream memoryStream = new MemoryStream())
        {
            byte&#91;] encryptedData = Convert.FromBase64String(source);

            using (CryptoStream cryptoStream = new CryptoStream(
                memoryStream,
                des.CreateDecryptor(keyBytes, ivBytes),
                CryptoStreamMode.Write))
            {
                cryptoStream.Write(encryptedData, 0, encryptedData.Length);
                cryptoStream.FlushFinalBlock();
            }

            return Encoding.UTF8.GetString(memoryStream.ToArray());
        }
    }

    /// &lt;summary&gt;
    /// 加密字符串为 Base64 编码的密文
    /// &lt;/summary&gt;
    /// &lt;param name="source"&gt;UTF8 编码的明文&lt;/param&gt;
    /// &lt;returns&gt;Base64 编码的密文&lt;/returns&gt;
    public string Encrypt(string source)
    {
        string key = GetSecretKey(_id);
        byte&#91;] keyBytes = Encoding.UTF8.GetBytes(key);
        byte&#91;] ivBytes = Encoding.UTF8.GetBytes(IV);

        using (DES des = DES.Create())
        using (MemoryStream memoryStream = new MemoryStream())
        {
            byte&#91;] plainData = Encoding.UTF8.GetBytes(source);

            using (CryptoStream cryptoStream = new CryptoStream(
                memoryStream,
                des.CreateEncryptor(keyBytes, ivBytes),
                CryptoStreamMode.Write))
            {
                cryptoStream.Write(plainData, 0, plainData.Length);
                cryptoStream.FlushFinalBlock();
            }

            return Convert.ToBase64String(memoryStream.ToArray());
        }
    }

    /// &lt;summary&gt;
    /// 字符串填充处理（前补指定字符至指定长度）
    /// &lt;/summary&gt;
    /// &lt;param name="str"&gt;原始字符串&lt;/param&gt;
    /// &lt;param name="code"&gt;填充字符&lt;/param&gt;
    /// &lt;param name="length"&gt;目标长度&lt;/param&gt;
    /// &lt;returns&gt;
    /// 当原始字符串长于目标长度时截断前部，&lt;br/&gt;
    /// 否则在左侧填充指定字符至目标长度
    /// &lt;/returns&gt;
    public static string PadString(string str, char code, int length)
    {
        ** (***.****** * ******) ****** *********(*, ******);
        ****** *** ******(****, ****** * ***.******) * ***;
    }

    /// &lt;summary&gt;
    /// 计算字符串的特征哈希值
    /// &lt;/summary&gt;
    /// &lt;param name="str"&gt;输入字符串&lt;/param&gt;
    /// &lt;returns&gt;64 位无符号哈希值&lt;/returns&gt;
    public static ulong GetHash(string str)
    {
        ***** **** = *********;
        ******* (**** * ** ***)
        {
            **** = (**** ** *) * **** * *;
        }
        ****** **** * ********;
    }

    /// &lt;summary&gt;
    /// 生成 DES 加密的 Key
    /// &lt;/summary&gt;
    /// &lt;param name="key"&gt;Key 种子&lt;/param&gt;
    /// &lt;returns&gt;
    /// 用于 DES 加解密的 Key
    /// &lt;/returns&gt;
    public static string GetSecretKey(string key)
    {
        ****** *************************
            * ***********
            * *********(*******(***).********(), '*', *);
    }
}</code></pre>



<p>通过注释中给出的示例，传入识别码构造实例，然后再调用对应的方法，能够以测试版 PCL 同款的方式加密或者解密信息。</p>



<pre class="wp-block-code"><code>var helper = new PCLSecretHelper("***AAAA-BBBB-CCCC-DDDD");
string encrypted = helper.Encrypt("*****************************");
Console.WriteLine($"加密后：{encrypted}");
string decrypted = helper.Decrypt("************");
Console.WriteLine($"解密后：{decrypted}");</code></pre>