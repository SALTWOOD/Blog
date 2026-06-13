---
title: '[烤肉] 战舰世界莱服封闭测试 25.7 — 潜艇机制大改'
description: ''
pubDate: 2025-07-12T13:06:34.000Z
updatedDate: 2026-03-21T16:14:38.184Z
tags: []
category: ''
---

<div class="wp-block-argon-alert alert" style="background-color:#7889e8"><span class="alert-inner--icon"><i class="fa fa-info-circle"></i></span><span class="alert-inner--text">本文是人工烤肉，原文在<a href="https://blog.korabli.su/blog/616" data-type="link" data-id="https://blog.korabli.su/blog/616">此处</a>。<br>This content is manually translated. Original post can be found <a href="https://blog.korabli.su/blog/616">here</a>.<br>Данный контент является ручным переводом. Оригинальный текст находится по <a href="https://blog.korabli.su/blog/616">ссылке</a>.</span></div>



<div class="wp-block-argon-alert alert" style="background-color:#f75676"><span class="alert-inner--icon"><i class="fa fa-exclamation-triangle"></i></span><span class="alert-inner--text">侵权请联系 <a href="mailto:admin@ski.ink">admin@ski.ink</a> 删除。<br>Contact <a href="mailto:admin@ski.ink">admin@ski.ink</a> for removal in case of infringement.<br>При нарушении прав пишите на <a href="mailto:admin@ski.ink">admin@ski.ink</a> для удаления.</span></div>



<div class="wp-block-argon-alert alert" style="background-color:#f75676"><span class="alert-inner--icon"><i class="fa fa-exclamation-triangle"></i></span><span class="alert-inner--text">这是我第一次烤肉。我会使用一些个人风格的表述以及中文战舰世界圈常用的名称和表述，显得不那么正式。不喜勿喷。</span></div>



<div class="wp-block-argon-alert alert" style="background-color:#f75676"><span class="alert-inner--icon"><i class="fa fa-exclamation-triangle"></i></span><span class="alert-inner--text">截至本文翻译完成时，25.7 已经发布，部分数据可能与本文记述不同。本文将不对实装后的不同之处进行修正。</span></div>



<div class="wp-block-argon-alert alert" style="background-color:#7889e8"><span class="alert-inner--icon"><i class="fa fa-info-circle"></i></span><span class="alert-inner--text">如有翻译错误，欢迎指出。</span></div>



<h2 class="wp-block-heading">战舰世界莱服封闭测试 25.7 — 潜艇机制大改</h2>



<p>25.7 版本将改变潜艇的游戏玩法！</p>



<p>三月份，游戏中新增了特殊的临时战斗类型<a href="https://korabli.su/ru/news/general-news/submarine-frontier/">“潜艇前线”</a>，我们在里头测试了修改过的的潜艇机制。根据测试结果，我们收到了大量的反馈。除此之外，我们分析了“潜艇前线”的战斗数据，并得出结论：修改方案很成功。</p>



<p>因此，在 25.7 版本中，我们计划将新的潜艇机制实装到游戏中。当然，还会进行一系列的完善和改进，并增加一些“潜艇前线”中没出现过的新机制。</p>



<p><strong>相较于“潜艇前线”的主要变化</strong>：</p>



<ul class="wp-block-list">
<li>调整了潜艇下潜能力设定</li>



<li>深弹拆鱼雷的效率降低（降低了半径等数值）</li>



<li>深弹拆水雷实装</li>



<li>修改了部分舰长技能和潜艇插</li>



<li>将给部分潜艇添加一种新型武器 —— 水雷空袭</li>



<li>将给部分潜艇添加炮射烟雾弹，以及在法潜线测试过的热能鱼雷</li>
</ul>



<p>特别地，现在可以全额出售 <strong>VIII 级金币潜艇</strong>，并全额返还购买 <strong>X 射水鱼</strong>和 <strong>X 絮库夫</strong>使用的达布隆。此外，还可以返还用于购买 <strong>X 猫鲨</strong> 的钢和用于购买 <strong>X U-4501</strong> 的研究点。</p>



<p>我们还会重置所有舰长学习的 U 艇技能，拆卸升级品也将暂时免费。</p>



<p>接下来直接介绍具体改动。</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading" id="id-封闭测试25.7潜艇2.0-重制潜艇的原因与目标">大改潜艇机制的原因与目标</h3>



<p>潜艇加入游戏已经两年多了，她们成了游戏不可或缺的一部分。我们已有 4 条银币潜艇线（法潜在测试并准备<a href="https://blog.korabli.su/blog/613">抢先体验</a>），以及一系列金币和特种潜艇。潜艇也拥有很多粉丝。</p>



<p>然而，它们的游戏玩法往往比较单一。潜艇要么近距离攻击并造成巨量伤害<s>贴脸自爆</s>，要么一亮就被对面反潜机集火。在这种情况下，潜艇常常暴毙，甚至 0 伤回港。潜艇的表现缺乏“中等水平”，大多数战斗都以上述极端情况之一结束。</p>



<p>同时，当潜艇贴脸撒雷并对敌人造成大量伤害时，会让受害者很不爽。即使这种战术对潜艇很危险且甚至不一定打得死对面，也于事无补。</p>



<p>我们希望改进潜艇的玩法机制，使与<em>水下小人</em>的互动更舒适，同时不恶化潜艇本身的游戏体验。相反，我们希望增加更多“深度”（毕竟是潜艇）和游戏玩法的多样性。</p>



<p>下面详细介绍新的潜艇游戏玩法。</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading" id="id-封闭测试25.7潜艇2.0-新概念简述">新概念简述</h3>



<p>潜艇机制将更新：它们无法瞬间造成大量伤害<s>贴脸自爆</s>，但其生存性将提高。因此，潜艇的伤害总量不会改变，但这些伤害将在整场战斗中厚积薄发。</p>



<p>更新后有两种雷 —— 更高伤但风险更高的声导雷；或者更安全但伤害更小的普通雷或热能鱼雷。</p>



<p>此外，借助新武器，潜艇在战斗中的作用和支援能力将得到加强。炮射烟雾弹可以射出炮弹，远程释放烟幕掩护己方舰船，水雷能卡走位。</p>



<p>潜艇的深度系统也将更清晰 — 每个深度都有明显的优缺点，使其更具有专一性。玩家需要根据战斗局势，上浮或者下潜以有效发挥潜艇作用。</p>



<p>所有变更的详细信息在下面。</p>



<p><em><strong>请注意：此次潜艇的改动规模较大，它不仅影响潜艇本身，还<em><strong>可能</strong></em>影响在战斗中遭遇潜艇的水面船。因此，我们不可避免地需要来自正式服实际战斗的数据和反馈，以完成对所有改动的平衡调整。目前我们不计划在改动实装后进行很大的改动，但极有可能在 25.7 版本之后的几个版本中，对潜艇及相关参数进行一些微调。</strong></em></p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading" id="id-封闭测试25.7潜艇2.0-鱼雷武器改动">鱼雷武器改动</h3>



<p>首先，我们将修改潜艇的鱼雷。改动涉及声导雷和普通雷。此外，将出现第三种雷 — 热能鱼雷。</p>



<p><strong>声呐与声导雷</strong></p>



<p>在新概念中，声导雷与声呐结合使用。</p>



<p>现在，要发射声导雷，需要先用声呐脉冲命中敌方舰船。一次命中只能发射一枚雷。要发射下一枚，需要再用声呐命中敌舰。声导雷的伤害也会被提高。</p>



<figure class="wp-block-video"><video controls src="https://blog-media.korabli.su/media/616/editor/xsYu2gJdmabkmvhHnGiPJgAjBD8w0JCoWdGhrUPx.mp4"></video></figure>



<p>声呐的工作原理也被改了。现在所有命中：</p>



<ul class="wp-block-list">
<li>是一次性的，无需命中两次同一区域来延长其作用时间或改善鱼雷制导</li>



<li>不绑定于舰船区域，只需用脉冲命中舰船任意位置，鱼雷就会向该点制导</li>



<li>没有作用时间</li>
</ul>



<p>只有目标舰船使用损害管制小组、发射的声导雷被摧毁、到射程了或偏角过大，声纳标记才会被移除。如果声呐命中后一段时间内未发射声导鱼雷，或者潜艇下潜至最大深度，声纳标记也会没掉。制导雷的导向能力和当前版本的声呐两次命中一样。</p>



<p>一艘船上可同时存在的标记数量以及向其发射的鱼雷数量取决于舰种，具体为：</p>



<ul class="wp-block-list">
<li>战列和航母：4 个。</li>



<li>巡洋：3 个。</li>



<li>驱逐和潜艇：1 个。</li>
</ul>



<p>另一项改动涉及潜艇 Ping 人时出现的水面效果（也就是水面的波纹）。现在它显示潜艇移动的方向，而不是脉冲发射的方向。</p>



<p><strong>普通雷</strong></p>



<p>普通雷的主要改动是伤害显著降低。潜艇将无法用它们在近距离短时间内造成大量伤害<s>，不能贴脸自爆了，好耶</s>。</p>



<p><strong>热能鱼雷</strong></p>



<p>这种新型鱼雷<a href="https://blog.korabli.su/blog/596">已经在法潜上测试过</a>，表现相当出色。它们与新系统中的普通雷非常相似，可在水面或潜望镜深度不使用声呐发射，且最大伤害较低。与普通雷不同的是，热能鱼雷能点火。</p>



<figure class="wp-block-video"><video controls loop src="https://blog-media.korabli.su/media/0/eKslKtWxCBQZd4xBuREDKVgpeJ1x32EMFBwr6n29.mp4"></video></figure>



<p><strong>潜艇在战斗中的新战术</strong></p>



<p>因此，潜艇现在有两种策略可选。第一种是使用声导雷，可以造成大量伤害，但会暴露位置，敌方可能会<s>（实际上几乎是一定会）</s>反击。第二种策略风险较小，也就是在灭点的情况下使用普通或热能鱼雷。然而，这种情况下潜艇的伤害会小很多。</p>



<p>此改动也使得“贴脸自爆”的战术变得极其低效，因为短时间、近距离很难再造成大量伤害。</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading" id="id-封闭测试25.7潜艇2.0-潜艇上的新武器类型">潜艇的新武器</h3>



<p>除了上面提到的热能鱼雷，改版后的潜艇还将获得另外两种新武器。其中一种（炮射烟雾弹）已在法潜上测试过，另一种则是大家既熟悉又陌生的水雷空袭。</p>



<p><strong>炮射烟雾弹</strong></p>



<p>我们已在<a href="https://blog.korabli.su/blog/607">开发者日志</a>中预告过它，其工作机制基本没有改动。炮弹不会对舰船造成伤害，它命中一段时间后会在命中点生成烟雾。</p>



<p>但在 25.7 版本中，我们将改进它的显示：现在选择炮射烟雾弹时，瞄准镜中会显示拉烟的区域。这样能方便玩家理解烟雾在何处生成，它的使用也将更直观。</p>



<figure class="wp-block-image"><img src="https://blog-media.korabli.su/media/616/editor/tZtslCzK42lxkHuuErCYzHVXnpofnJ6ZB7YIQUsv.jpg" alt=""/></figure>



<p><strong>水雷空袭</strong></p>



<p>潜艇上新颖但为大家熟悉的武器类型将是<strong>水雷空袭</strong>。它们已存在于日航二线和巡洋舰<strong> X 九头龙</strong>上。然而，大多数潜艇没有机库，因此，水雷空袭会像普通空袭一样，只是不能瞄准。这意味着水雷机组激活时会在潜艇所在的位置布设水雷（如视频）。</p>



<figure class="wp-block-video"><video controls src="https://blog-media.korabli.su/media/616/editor/XfiDRhfpRv3qZqdkGSSWGh0ud5U94SDsobgFebqS.mp4"></video></figure>



<p>与其他类型的空袭一样，潜艇的水雷空袭有一定数量，且按顺序装填。除了最大深度外，可在任何深度使用。布雷过程本身与日航和<strong> X 九头龙</strong>完全相同。潜艇的水雷作用半径将显著降低（目前约为 300-600 米，而 <strong>X 大凤</strong>为 2 公里），但布雷密度更高。</p>



<p><strong><em>请注意：目前水雷空袭是计划在超测中验证的概念。并不意味着它会在 25.7 版本中永久进入正式服。我们会根据结果作出决定。</em></strong></p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading" id="id-封闭测试25.7潜艇2.0-潜艇深度状态改动">潜艇深度状态改动</h3>



<p>潜艇的深度状态也将被修改 — 状态将变为四种，其特性也会改变。每种状态都将有明显的优缺点。</p>



<p>我们先在表格中列出各种状态及其优缺点，然后再详细讨论。</p>



<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>&nbsp;</th><th>水面</th><th>潜望镜深度</th><th>工作深度</th><th>极限深度</th></tr></thead><tbody><tr><td>可用武器</td><td>所有可用武器</td><td>鱼雷和水雷</td><td>仅声导雷和水雷</td><td>不可用</td></tr><tr><td>潜艇速度</td><td>满航速</td><td>最大航速的 1/3</td><td>满航速</td><td>最大航速的 1/3</td></tr><tr><td>下潜能力</td><td>恢复</td><td>冻结</td><td>消耗</td><td>消耗</td></tr><tr><td>侦察范围*</td><td>正常</td><td>&nbsp;5 公里</td><td>2 公里</td><td>2 公里</td></tr><tr><td>潜艇可见目标</td><td>友军和敌军</td><td>友军和敌军</td><td>仅友军</td><td>仅友军</td></tr><tr><td>水听器</td><td>关闭</td><td>自动工作</td><td>自动工作</td><td>关闭</td></tr><tr><td>反潜伤害</td><td>最大值的 1/10&nbsp;</td><td>最大</td><td>最大</td><td>最大值的 1/10&nbsp;</td></tr></tbody></table></figure>



<p><em>*潜艇在游戏中可以看到舰船的半径。</em></p>



<p><strong>水面状态</strong></p>



<p>此状态几乎没有变化。其主要功能仍是恢复下潜能力和发动攻击。同时，水面的潜艇最显眼且易受敌方火力攻击，但只会承受深弹和深弹空袭 10% 的伤害。</p>



<figure class="wp-block-image"><img src="https://blog-media.korabli.su/media/616/editor/XA0TIVVtumfpLjheuGWuwWfpDoaVailJOXZY4TTe.jpg" alt=""/></figure>



<p><strong>潜望镜深度</strong></p>



<p>此状态的主要用途是隐蔽发动攻击。但现在在此深度会更难机动：潜艇速度会降低 2/3。</p>



<p>在此深度，水听器会自动开始工作。它不再是消耗品，并在潜望镜深度和工作深度持续生效。半径内的敌方舰船会收到“位置已暴露”的通知。</p>



<p>在此深度及更深的深度，潜艇不会被飞机点亮。</p>



<figure class="wp-block-image"><img src="https://blog-media.korabli.su/media/616/editor/l2vATpL2ywDgO0vvFuy0Lw1iZmCRwlQ0y5o8f3m6.jpg" alt=""/></figure>



<p><strong>工作深度</strong></p>



<p>在此深度，潜艇可以在地图上快速机动而不被发现。代价是侦察范围降低，以及无法看到被点亮的敌舰。不过还是能够发动攻击。在此深度水听器会工作，潜艇如果能用声呐命中水听器显示的敌舰轮廓，也发射声导鱼雷。此外，水雷空袭仍然可用。</p>



<figure class="wp-block-image"><img src="https://blog-media.korabli.su/media/616/editor/Cxzf1M9VRTJ6RrGCDh5yAI6eOybcR24SRNkxSVas.jpg" alt=""/></figure>



<p><strong>最大深度</strong></p>



<p>这是潜艇最安全的深度，在被集火时使用。其主要优势是承受的反潜伤害显著降低。然而，潜艇将付出巨大的代价：无法使用任何武器（所有被声呐标记的区域在进入此深度时会消失），航速降低到原先的 1/3，视野也受到极大限制。</p>



<figure class="wp-block-image"><img src="https://blog-media.korabli.su/media/616/editor/bIPRHbPkD1jt4oheBi00TQHzUFvtT8Lqs28liCBk.jpg" alt=""/></figure>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading">反潜武器（ASW）改动</h3>



<p>目前深弹是一种高度专一的武器。仅对潜艇有效，如果战斗中没有潜艇或它们在另一线，ASW 则完全无用。同时，ASW 对潜艇本身极为有效：它造成高额伤害并有巨大的攻击半径，经常让潜艇漏油（此机制在重制后保留），暴露潜艇位置。</p>



<p>我们希望改进其机制，增大深弹和空袭的适用范围。现在，如果炸弹投下后没有命中潜艇，它们不会立即爆炸，而会在原地等一段时间。这使得即使提前量过大，也更容易打中潜艇。</p>



<figure class="wp-block-video"><video controls src="https://blog-media.korabli.su/media/616/editor/fgKkS4rSR7k8MAHftUW8qIjgvIobbsmcB5boL2Bv.mp4"></video></figure>



<p>深弹也能对所有舰船造成伤害（水面舰船仅受到标伤 10% 的伤害，但可能会进水），并能摧毁经过的鱼雷和水雷。我们为此添加了新的勋带。</p>



<figure class="wp-block-image"><img src="https://blog-media.korabli.su/media/616/editor/wEsSbfjMTlmFPUZ2eE4PWXHtsgS9aK2Lbx0ANQ2x.jpg" alt=""/></figure>



<p>同时，空袭（DB）的装填时间将增加。此外，空袭（DB）飞机抵达时间现在是固定的，不取决于投掷距离。这将使其使用更清晰、更可预测。</p>



<p>需要强调的是，我们将减小反潜武器对鱼雷的触发半径，以防止 ASW 对依赖鱼雷玩法的舰船产生过度效果。</p>



<p>我们还将重新审视 VIII–X 级战列舰和超战的空袭（DB）范围，以平衡其新能力：</p>



<ul class="wp-block-list">
<li>对于 VIII–IX 级战列舰，范围从 10 公里减少到 9 公里。</li>



<li>对于 X 级战列舰和超战，范围从 11 公里减少到 10 公里。</li>
</ul>



<p>因此，反潜武器将具备在所有战斗中使用的充分潜力，玩家会有更多方法应对鱼雷和水雷。</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading">潜艇的其他改动</h3>



<p>另外两项改动涉及潜艇的<strong>视野</strong>。</p>



<p>首先，新概念中移除了消耗品“潜艇监视设备”。我们大改了潜艇的深度状态系统，清晰区分了其优缺点。保留此消耗品会破坏这个逻辑，按我们的设想，该逻辑应固定且能让玩家形成肌肉记忆。</p>



<p>“对海搜索”与潜艇的交互原理也将改变。现在它能在整个作用半径内“看到”处于潜望镜深度和工作深度的潜艇。潜艇将以轮廓形式显示（类似潜艇通过水听器看到的敌军舰船），轮廓每隔几秒更新一次。</p>



<figure class="wp-block-video"><video controls src="https://blog-media.korabli.su/media/0/arDwjhxyunF1o9mRoJ0S2cxe1To2S4FQAZSJHT7Q.mp4"></video></figure>



<p><strong>无法通过对海搜索看到最大深度的潜艇</strong>，而水面对潜艇的发现则与此消耗品对其他舰船的发现方式相同。</p>



<p>此外，潜艇的<strong>下潜能力</strong>设定也将更新。</p>



<p>首先，所有潜艇的下潜能力恢复速度将为 0.1 /秒，而其消耗速度不变。同时，下潜能力储备也被改了：大多数潜艇的下潜能力储备将减少。这些改动基于战斗中下潜能力使用的统计数据，目的并非削弱潜艇。我们只想避免潜艇在战斗后期剩余大量下潜能力，并能长时间躲避敌人，过度“拖延”战斗的情况。特别说明，改动后部分潜艇将获得消耗品“储备蓄电池单位”，且在潜望镜深度时下潜能力不会消耗。</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading">潜艇在战斗中的新职责</h3>



<p>总的来说，考虑到所有改动，潜艇的职责和游戏玩法在新概念中将有所变化。</p>



<p>首先，潜艇的生存性将提高。现在即使潜艇被短暂发现，也很难快速摧毁或对其造成大量伤害。因此，玩潜艇会稍微容易些，潜艇的容错率会更高些。</p>



<p>同时，提高生存性的代价是鱼雷的改动：贴脸自爆不大行了。潜艇要么暴露自己换取更大的伤害（用声呐脉冲命中敌人），要么满足于显著降低的伤害（使用普通或热能鱼雷，发射时不暴露自己）。</p>



<p>潜艇还将获得两种强大的战术工具 — 水雷空袭和炮射烟雾弹。前者能封锁特定方向或在关键区域进行防御，后者则能掩护自己或友军。</p>



<p>因此，它们的职责将更多是辅助友军。潜艇也将更多为友军进行侦察。</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading">潜艇的新概念</h3>



<p><strong>可研发潜艇线</strong></p>



<p>考虑到舰种及其机制改动的规模，我们不可避免地会更新现有潜艇线的概念。例如，所有可研发潜艇的普通鱼雷将被替换为热能鱼雷。此外，根据当前设想，法潜和英潜能使用炮射烟雾弹，而水雷空袭将属于苏潜和英潜。</p>



<p><strong>金币和特种潜艇</strong></p>



<p>在重制金币和特种潜艇的设定时，我们尽可能保留它们的特点和概念。然而，它们也会受到这次改动的影响：“水听器”和“潜艇监视设备”消耗品会被移除，声导和普通雷的特性及工作机制将按照新设定被调整。</p>



<p>特别说明，目前我们计划保留 <strong>X 絮库夫</strong>的特性。而部分潜艇，例如 <strong>X 猫鲨</strong>，由于其游戏玩法特点，改动会更大。</p>



<p>有关潜艇新概念和特性的详细信息将在稍后单独发的一篇文章中公布。</p>



<p>请注意，25.7 版本更新后，玩家将可以全额返还购买 <strong>VIII 级金币潜艇、X 絮库夫和 X 射水鱼</strong>的达布隆。此外，<strong>X 猫鲨</strong>和 <strong>X U-4501</strong> 可分别兑换为等价的钢材和研究点。补偿详情将在稍后公布。</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h3 class="wp-block-heading">相关改动</h3>



<p>由于这次更新在概念层面改了了许多特性，部分舰长技能和升级品会没用。为避免这种情况，我们将更新它们。</p>



<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><th>技能/升级品</th><th>当前条件与加成</th><th>新条件与加成</th></tr><tr><td colspan="3"><strong>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;舰长技能</strong></td></tr><tr><td>舵手（1 级）</td><td>激活“水听器”消耗品后 15 秒内，减少 10% 的船舵和深度舵的换挡时间。</td><td>被敌人发现时，缩短 10% 的方向舵和深度舵换挡时间。</td></tr><tr><td>来袭预警（1 级）</td><td>当有敌方舰船在 4.5 公里外开火时收到警告。</td><td>获得“掩护”勋章后 30 秒内，减少主炮装填时间 20%。重复获得勋章不延长技能持续时间。</td></tr><tr><td>大容量蓄电池（2 级）</td><td>增加 10% 下潜能力储备。减少 20% 下潜能力恢复速度。</td><td>增加 5% 下潜能力储备。</td></tr><tr><td>机电专员（3 级）</td><td>影响声呐单次和双次命中标记区域的作用时间。</td><td>在潜望镜深度和极限深度增加 10% 航速。</td></tr><tr><td>鱼雷瞄准大师（4 级）</td><td>对声呐双次标记区域的舰船增加 25% 鱼雷伤害。</td><td>增加 10% 鱼雷伤害。</td></tr><tr><td>深潜大师（4 级）</td><td>在激活“水听器”消耗品后的 30 秒内，延长被标记区域的作用时间。</td><td>在极限深度减少 10% 承受的炸弹伤害。</td></tr><tr><td>增大型螺旋桨轴（4 级）</td><td>当潜艇下潜能力低于最大储备的 50% 时，在水面状态和潜望镜深度增加 18% 航速。</td><td>当潜艇下潜能力低于最大储备的 10% 时，在水面状态增加 18% 航速。</td></tr><tr><td>高效率蓄电池（4 级）</td><td>当潜艇下潜能力低于最大储备的 50% 时，在水面增加 25% 下潜能力恢复速度。</td><td>当潜艇下潜能力低于最大储备的 10% 时，在水面增加 100% 下潜能力恢复速度。</td></tr><tr><td colspan="3"><strong>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 升级品</strong></td></tr><tr><td>下潜能力修改型 1（安装于 3 号槽）&nbsp;</td><td>增加 10% 下潜能力恢复速度。</td><td>增加 50% 下潜能力恢复速度。</td></tr><tr><td>声呐修改型 1（安装于第 3 槽）&nbsp;</td><td>增加 10% 声呐脉冲速度</td><td>减少 5% 声呐装填时间。</td></tr></tbody></table></figure>



<p><strong>请注意，开发者日志中的所有信息均为初步信息。宣布的改动和新内容在测试过程中可能多次更改。最终信息将在官网上发布。</strong></p>