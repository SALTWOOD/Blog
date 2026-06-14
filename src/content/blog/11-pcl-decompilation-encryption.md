---
title: "PCL 反编译——加密和解密原理记录"
description: ""
pubDate: 2025-04-04T14:47:06.000Z
updatedDate: 2026-04-04T14:27:41.636Z
# heroImage: '../../assets/11.webp'
tags: [PCL, 逆向, .NET]
category: ""
---

## 0. 起因

在 Google 上搜 "PCL" 找到[一篇文章](https://www.luogu.com/article/ughew4si)，通过对 PCL 旧版泄露源码和非法魔改测试版的反编译，验证了这篇文章部分的事实。

但也仅限于部分，反编译的代码只能确定有同名的方法，却不能确定方法内部实现是否相同。

同时，那篇文章只贴出了 PCL 加解密的部分代码，抠掉了重要的部分，于是对 PCL 的加解密产生了兴趣的我开始尝试反编译 PCL 的测试版。

## 1. 直接尝试反编译

既然 PCL 是用 Visual BASIC 编写的，那么肯定基于 .NET。
既然基于 .NET，那就可以请出我们的 .NET 反编译大神——[ILSpy](https://github.com/icsharpcode/ILSpy)。

但是，在把测试版的 PCL 拖进 ILSpy 之后，却发现无法解析——

[![image](https://static.ski.ink/blog-uploads/11/images/1.webp)](https://static.ski.ink/blog-uploads/11/images/1.webp)

经过一番研究和询问龙猫，得知 PCL 测试版是经过加壳的，需要先脱壳再反编译才可能得到代码。

## 2. 尝试脱壳

在 GitHub 搜索过后，我找到了两个项目

[void-stack/VMUnprotect.Dumper](https://github.com/void-stack/VMUnprotect.Dumper)

[SychicBoy/NETReactorSlayer](https://github.com/SychicBoy/NETReactorSlayer)

搭配 ILSpy 尝试了一下，用它们两个去旧测试版的 PCL 壳是没有问题的，只是代码被混淆了而已，但是去新测试版的壳却又出现了问题。

再次询问群友，得知龙猫最近更新了 PCL，使用了 .NET Reactor 的 6.5 版本，而这个版本**目前没有脱壳的方法**，反混淆倒是可以用 **NETReactorSlayer**。

## 3. 转换思路

虽然没法直接反编译新测试版的 PCL，但是我从群友那里得知并验证了一个信息：**除了秋仪金主题相关的，其他部分的加密方式并没有更改过。**

于是我找来了**旧测试版**的 PCL，通过 **VMUnprotect.Dumper**，成功脱壳了 PCL 反编译了源码，获取到了那篇文章提及的 `GetHash` `StrFill` 和 `SecureKey` 三个方法，与原文中提供的 `SecureAdd` 和 `SecureRemove` 拼凑在一起，再去拿来密文和识别码，调用方法，成功解密出数据！

[![image](https://static.ski.ink/blog-uploads/11/images/2.webp)](https://static.ski.ink/blog-uploads/11/images/2.webp)

## 4. 代码

再经过一些优化和改进，我写出了这么一个类：

```csharp
using System.Security.Cryptography;
using System.Text;
/// <summary>
/// 一个适用于 PCL 测试版的加解密助手类。
/// </summary>
/// <remarks>
/// <para>
/// 通过 Encrypt 和 Decrypt 方法，可以生成或解密 PCL 同款加密方式的密文。<br/>
/// 注意：秋仪金主题使用 RSA 加密方式，此类无法处理，需获取龙猫的私钥。
/// </para>
/// <example>
/// 使用示例：
/// <code>
/// var helper = new PCLSecretHelper("PCLAAAA-BBBB-CCCC-DDDD");
/// string encrypted = helper.Encrypt("0|1|2|3|4|5|6|7|9|10|11|12|13");
/// string decrypted = helper.Decrypt("+NRco8AuOV8=");
/// </code>
/// </example>
/// </remarks>
public class PCLSecretHelper
{
    /// <summary>初始化向量</summary>
    public const string IV = "95168702";
    /// <summary>哈希计算初始值</summary>
    public const int HASH_INIT = 5381;
    /// <summary>哈希计算异或值</summary>
    public const ulong HASH_XOR = 0xA98F501BC684032FUL;
    /// <summary>默认加密密钥</summary>
    public const string DEFAULT_KEY = "@;$ Abv2";
    private readonly string _id;
    /// <summary>
    /// 使用指定的启动器识别码初始化助手类
    /// </summary>
    /// <param name="id">形如 PCLAAAA-BBBB-CCCC-DDDD 的识别码</param>
    public PCLSecretHelper(string id)
    {
        _id = id;
    }
    /// <summary>
    /// 解密 Base64 编码的密文字符串
    /// </summary>
    /// <param name="source">Base64 编码的密文</param>
    /// <returns>UTF8 编码的明文</returns>
    public string Decrypt(string source)
    {
        string key = GetSecretKey(_id);
        byte[] keyBytes = Encoding.UTF8.GetBytes(key);
        byte[] ivBytes = Encoding.UTF8.GetBytes(IV);
        using (DES des = DES.Create())
        using (MemoryStream memoryStream = new MemoryStream())
        {
            byte[] encryptedData = Convert.FromBase64String(source);
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
    /// <summary>
    /// 加密字符串为 Base64 编码的密文
    /// </summary>
    /// <param name="source">UTF8 编码的明文</param>
    /// <returns>Base64 编码的密文</returns>
    public string Encrypt(string source)
    {
        string key = GetSecretKey(_id);
        byte[] keyBytes = Encoding.UTF8.GetBytes(key);
        byte[] ivBytes = Encoding.UTF8.GetBytes(IV);
        using (DES des = DES.Create())
        using (MemoryStream memoryStream = new MemoryStream())
        {
            byte[] plainData = Encoding.UTF8.GetBytes(source);
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
    /// <summary>
    /// 字符串填充处理（前补指定字符至指定长度）
    /// </summary>
    /// <param name="str">原始字符串</param>
    /// <param name="code">填充字符</param>
    /// <param name="length">目标长度</param>
    /// <returns>
    /// 当原始字符串长于目标长度时截断前部，
    /// 否则在左侧填充指定字符至目标长度
    /// </returns>
    public static string PadString(string str, char code, int length)
    {
        if (str.Length > length) return str.Substring(0, length);
        return new string(code, length - str.Length) + str;
    }
    /// <summary>
    /// 计算字符串的特征哈希值
    /// </summary>
    /// <param name="str">输入字符串</param>
    /// <returns>64 位无符号哈希值</returns>
    public static ulong GetHash(string str)
    {
        ulong hash = HASH_INIT;
        foreach (char c in str)
        {
            hash = (hash << 5) ^ hash ^ c;
        }
        return hash ^ HASH_XOR;
    }
    /// <summary>
    /// 生成 DES 加密的 Key
    /// </summary>
    /// <param name="key">Key 种子</param>
    /// <returns>
    /// 用于 DES 加解密的 Key
    /// </returns>
    public static string GetSecretKey(string key)
    {
        return string.IsNullOrEmpty(key)
            ? DEFAULT_KEY
            : PadString(GetHash(key).ToString(), 'X', 8);
    }
}
```

通过注释中给出的示例，传入识别码构造实例，然后再调用对应的方法，能够以测试版 PCL 同款的方式加密或者解密信息。

```csharp
var helper = new PCLSecretHelper("PCLAAAA-BBBB-CCCC-DDDD");
string encrypted = helper.Encrypt("0|1|2|3|4|5|6|7|9|10|11|12|13");
Console.WriteLine($"加密后：{encrypted}");
string decrypted = helper.Decrypt("+NRco8AuOV8=");
Console.WriteLine($"解密后：{decrypted}");
```
