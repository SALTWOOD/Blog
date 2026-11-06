// 左边栏的数据驱动配置。
//
// 想调整某页的左边栏，直接增删下方数组里的条目即可，顺序就是展示顺序。
// 每个 block 的 `type` 决定渲染哪种卡片：
//
//   author          作者卡（头像 / 名字 / 简介 / 坐标），无需额外字段
//   site-stats      站点统计（文章数 / 标签数），适合主页
//   reading-stats   本篇阅读数据（阅读时长 / 字数），仅文章页有效
//   recent          最近文章，可选 count（默认 4）
//   tags            标签云，可选 title / limit（默认 12）
//   nav             链接列表，需 items: { label, href, external? }[]
//   note            自定义文字块，需 title 与 body
//
// 新增一种卡片：在 Sidebar.astro 里加一个 type 分支即可。

import { isExternal, labelFor, navFor } from './nav';

export interface NavItem {
	label: string;
	href: string;
	external?: boolean; // 外链在新标签打开
}

export interface SidebarBlock {
	type:
		| 'author'
		| 'site-stats'
		| 'reading-stats'
		| 'recent'
		| 'tags'
		| 'nav'
		| 'note';
	title?: string;
	count?: number;
	limit?: number;
	items?: NavItem[];
	body?: string;
}

// 主页左边栏
export const homeSidebar: SidebarBlock[] = [
	{ type: 'author' },
	{ type: 'site-stats' },
	{
		type: 'nav',
		title: '导航',
		// 入口统一在 config/nav.ts 维护，这里只取侧栏需要的那一份。
		items: navFor('sidebar').map((destination) => ({
			label: labelFor(destination, 'sidebar'),
			href: destination.href,
			external: isExternal(destination.href),
		})),
	},
	// { type: 'tags', title: '热门标签', limit: 14 },
];

// 文章页左边栏
export const articleSidebar: SidebarBlock[] = [
	{ type: 'author' },
	{ type: 'reading-stats' },
	{ type: 'recent', count: 4 },
];
