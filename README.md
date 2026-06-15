# 盐木的小破窝

> [盐木的个人博客](https://blog.ski.ink)，基于 [Astro](https://astro.build/) 构建。记录游戏、运维、安全与逆向工程的实践与思考。

## 添加友链

欢迎交换友链！本站友链信息存储在 [`src/pages/friends.astro`](src/pages/friends.astro) 中的 `friendData`，头像存放在 `src/assets/friends/`。请按以下步骤提交 PR：

1. Fork 本仓库并克隆到本地
2. 将你的头像重命名为 **`<slug>.webp`**（正方形，WebP），放入 `src/assets/friends/`
3. 在 [`src/pages/friends.astro`](src/pages/friends.astro) 的 `friendData` 末尾新增一行（可以照着前面的数据改）
4. 使用 `pnpm build && pnpm preview`，打开本地页面预览
5. 确认你的友链卡片显示正常、头像无误
6. 提交，并且发起 PR，在 PR body 中说明：

- 站点名称 / 地址
- 是否已在本站添加反向链接（互链）
- 联系方式

### 友链须知

提交前请确认你的站点：

- 正常可访问，且为 **HTTPS**
- 内容合法合规、无违法违规或低俗信息
- 有一定比例原创内容
- 添加本站反向链接

最终是否 approve 由我审核决定。如需修改或下架友链，同样请提交 PR。