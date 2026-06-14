---
title: '[烤肉] 战舰世界莱服封闭测试 25.8 — 航母支援中队'
description: '人工烤肉，翻译战舰世界莱服 25.8 封闭测试开发者日志，介绍新增的航母支援中队。'
pubDate: 2025-07-13T03:12:54.000Z
updatedDate: 2026-03-21T16:14:38.184Z
# heroImage: '../../assets/18.jpg'
tags: [战舰世界, 游戏, 烤肉]
category: ''
---

> [!NOTE]
> 本文是人工烤肉，原文在[此处](https://blog.korabli.su/blog/621)。
> This content is manually translated. Original post can be found [here](https://blog.korabli.su/blog/621).
> Данный контент является ручным переводом. Оригинальный текст находится по [ссылке](https://blog.korabli.su/blog/621).

> [!WARNING]
> 侵权请联系 [admin@ski.ink](mailto:admin@ski.ink) 删除。
> Contact [admin@ski.ink](mailto:admin@ski.ink) for removal in case of infringement.
> При нарушении прав пишите на [admin@ski.ink](mailto:admin@ski.ink) для удаления.

> [!WARNING]
> 我烤肉会使用一些个人风格的表述以及中文战舰世界圈常用的名称和表述，显得没有那么正式。不喜勿喷。

> [!WARNING]
> 截至本文翻译完成时，25.8 尚未发布，部分数据可能与本文记述不同。本文将不对实装后的不同之处进行修正。

> [!NOTE]
> 如有翻译错误，欢迎指出。

## 战舰世界莱服封闭测试 25.8 — 航母支援中队

我们将介绍将在 25.8 版本测试的新型中队。

2024 年初游戏里新增了日航二线。日航二线专注于团队协作和妨碍敌人——包括机载发烟器和水雷轰炸机。日航二线表明具有**支援**机制的舰船非常受欢迎。

同时，这类机制是重要的“新鲜血液”。航母的机制较为单一，且装备选择相当有限，想要给航母带来些新鲜感通常只能依靠调整她们武器栏中已有的装备。

综上，我们希望继续改进支援友军的机制。因此在 25.8 版本中，我们将唤起老窝批的记忆，测试所谓的“支援中队”——**巡逻侦察机**、**烟雾布设机**和**截击机**。后者与同名装备相似，但应用方式略有不同。下面我们将按顺序详细介绍。

![](https://blog-media.korabli.su/media/621/xpe5GBg1nELqBOcsFNFmDgZsL87F8zSVq4qae2zj.jpg)

![](https://blog-media.korabli.su/media/621/txqgJ8IDGEP3bu7Y8Q7zsrCMyGuTLFgpaVnuUU85.jpg)

![](https://blog-media.korabli.su/media/621/LH2h4VQJnMHZSUH2IMC3SqVM6XsRmAs2LT7wvhug.jpg)

![](https://blog-media.korabli.su/media/621/GaTUBBwJPN2Gt9AEfojqc9av6eD28bnFckYPLRtz.jpg)

*需要强调的是，**这些只是计划在超测中验证的概念，并不意味着它会实装到正式服。我们会根据结果作出决定。***

---

#### 共同点

在介绍三种中队的功能之前，先说明它们的共同点。它们**不会**由玩家直接控制。其运作原理在某些方面类似空袭中队。激活支援飞行中队时，摄像机将上升进入战术模式。这有点像 RTS 航母（即 0.8.0 版本之前的航母）的视角，老窝批应该知道。光标周围会显示一个区域，支援飞行中队将在此区域被召唤，小地图和游戏世界中都会显示。

*每种中队的详细应用演示视频可在下一版块查看。*

![](https://blog-media.korabli.su/media/621/PZSTQ3tNvcGHWa5ie0JkeD42bkG7HJsaJa0gg2mp.jpg)

![](https://blog-media.korabli.su/media/621/NCWx0mAR18MByVoD0TlPkGjxjtwADbIS3PeBp7F8.jpg)

![](https://blog-media.korabli.su/media/621/gC02mQEzv5GyLIHqv7tuYSwCdUqF9pyT5whdrPoA.jpg)

在战术模式下，可以通过鼠标移动位置。鼠标滚轮可缩放摄像机，移动速度取决于位置（摄像机越高，移动得越快）。可通过 WASD 键移动区域（因此可组合按键和鼠标实现最佳瞄准）。此期间无法用方向键控制航母，只能通过战术地图为舰船设置路线。切换到其他支援中队不会使玩家退出战术模式。要“从天空回到地面”，玩家需要切换回普通中队（不会起飞）。  
*译者注：类似选中深弹空袭时的视角，按一下普通中队和战列在深弹空袭界面切回 HE/AP 弹一样，但是挪鼠标是绕作用区域旋转的*

顺便说一下航母——游戏中新增了特种舰船 **X 中途岛TEST**（如上截图所示）。她装备三种支援中队和两种普通中队（装载 Tiny Tim 的攻击机和鱼雷机）。后者的多项数据接近 **X 白龙**的鱼雷机。

支援飞行中队有使用次数，使用一次会消耗**所有**支援中队的次数。消耗完次数后，所有三种飞行中队将进入冷却。我们希望测试支援中队在这种设定下的效果，但未来也有可能改回老式的独立次数和冷却机制。

![](https://blog-media.korabli.su/media/621/6wtz99BAI3fMHYXnD9isJX75j3anvohfjY8ik0O9.jpg)

---

#### 飞行中队详情

**巡逻侦察机**

[视频](https://blog-media.korabli.su/media/0/IRx7rQkJIKbLdoDmNSq0qA0riAAe7ZsrhtFRNqgh.mp4)

它可以提升区域内所有友军舰船的主炮射程和精度。一艘舰船只能受到一个巡逻侦察机的增益效果（最先部署的那个）。但舰船自己的侦察机的增益会与支援中队的增益叠加。

被巡逻侦察机 Buff 的玩家在舰船状态屏幕（H键）能看到特殊图标及相关增益信息。它也会提示该增益的剩余持续时间。

特性：

- Buff：
  - +10% 主炮射程
  - -15% 主炮炮弹最大散布
- 冷却时间为 120 秒
- 作用时间为 60 秒
- 作用半径为 1.8 公里
- 可用机组为 2
- 每组飞机数为 3
- 飞机血量为 3000

**烟雾布设机**

[视频](https://blog-media.korabli.su/media/0/AeiO2W5JNIMF0alTnEJ3GoZPNjf77UDtd5CTs287.mp4)

在选定区域设置类似甜甜圈形状的烟雾屏障。

如果舰船位于这个“甜甜圈”的中心，飞越烟雾上空的敌机仍然可以发现她。

特性：

- 作用时间为 9.0 秒
- 烟雾消散时间为 65 秒
- 作用半径为 0.5 公里
- 冷却时间为 120 秒
- 可用机组为 2
- 每组飞机数为 3
- 飞机血量为 3000

**截击机**

[视频](https://blog-media.korabli.su/media/0/xHIbQ9ajY3jTGvICOCmdLZ2O0qk9yhil8n7AtfVR.mp4)

在选定区域巡逻并攻击敌方飞机。与同名装备一样，无法点亮敌舰。该中队的巡逻区域大小与 **X 大凤**的**截击机**相同。

特性：

- 冷却时间为 120 秒
- 作用时间为 60 秒
- 作用半径为 3.5 公里
- 可用机组为 2
- 每组 9 架飞机数
- 飞机血量为 200

三种中队的参数只会受到部分加点和升级品等 Buff 的影响（“生存专家”技能对飞机血量，“炸弹固定系统”升级对空袭飞机准备速度等）。装备升级对支援飞行中队无效（例如“巡逻队长”技能对截击机装备的加成**不会**作用于截击机支援中队）。

我们以后可能会改进这些中队。您的反馈对此非常重要。请在[论坛](https://forum.korabli.su/topic/166626-%D0%B7%D0%B0%D0%BA%D1%80%D1%8B%D1%82%D0%BE%D0%B5-%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5-258-%E2%80%94-%D1%8D%D1%81%D0%BA%D0%B0%D0%B4%D1%80%D0%B8%D0%BB%D1%8C%D0%B8-%D0%BF%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%BA%D0%B8/)留下您的评论！

**请注意，开发者日志中的所有信息均为初步信息。宣布的改动和新内容在测试过程中可能多次更改。最终信息将在官网上发布。**
