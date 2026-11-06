// 全站导航的单一数据源。
//
// 每个目的地只在这里定义一次：文案、URL、图标，以及它出现在哪些位置
// （`place` 的 key）和在该位置内的排序（`place` 的值，小的在前）。
//
// 新增入口：追加一个对象，在 place 里写上目标位置即可。
// 删除入口：删掉整个对象，Header / 侧栏 / 首页会同步消失。
//
// 位置：
//   header   桌面顶部导航
//   mobile   手机折叠菜单
//   sidebar  主页左侧栏「导航」卡片
//   home     首页「去逛逛」卡片

import { TRAVELLINGS } from './footer';

export type NavSurface = 'header' | 'mobile' | 'sidebar' | 'home';

export interface NavDestination {
	/** 稳定标识，用于查找或按 id 引用 */
	id: string;
	/** 默认文案 */
	label: string;
	/** 全站唯一 URL */
	href: string;
	/** 首页「去逛逛」卡片图标，对应 ICON_BODIES 的 key */
	icon?: string;
	/** 某个位置需要不同文案时覆盖默认值 */
	labels?: Partial<Record<NavSurface, string>>;
	/** 出现的位置 -> 该位置内的排序权重（小的在前） */
	place: Partial<Record<NavSurface, number>>;
}

export const NAV: NavDestination[] = [
	{
		id: 'search',
		label: '搜索',
		href: '/search',
		place: { mobile: 5 },
	},
	{
		id: 'blog',
		label: '文章',
		href: '/blog',
		icon: 'book-open',
		labels: { home: '博客' },
		place: { header: 10, mobile: 10, home: 10 },
	},
	{
		id: 'tags',
		label: '标签',
		href: '/tags',
		place: { header: 20, mobile: 20, sidebar: 10 },
	},
	{
		id: 'travellings',
		label: '开往',
		href: TRAVELLINGS.href,
		icon: 'train-front',
		labels: { sidebar: '开往 · travellings' },
		place: { header: 30, mobile: 30, sidebar: 40, home: 40 },
	},
	{
		id: 'friends',
		label: '友链',
		href: '/friends',
		icon: 'users',
		place: { header: 40, mobile: 40, sidebar: 20, home: 20 },
	},
	{
		id: 'github',
		label: 'GitHub',
		href: 'https://github.com/SALTWOOD',
		place: { sidebar: 30 },
	},
	{
		id: 'status',
		label: '服务状态',
		href: 'https://saltwood.top:3001/status/all',
		icon: 'activity',
		place: { home: 30 },
	},
];

/** 某个位置需要展示的入口，已按 place 排序。 */
export function navFor(surface: NavSurface): NavDestination[] {
	return NAV.filter((destination) => destination.place[surface] !== undefined).sort(
		(a, b) => a.place[surface]! - b.place[surface]!,
	);
}

/** 取某个位置使用的文案，没有覆盖时回退到默认文案。 */
export function labelFor(destination: NavDestination, surface: NavSurface): string {
	return destination.labels?.[surface] ?? destination.label;
}

/** 外链统一判定，避免各组件各写一套。 */
export function isExternal(href: string): boolean {
	return /^https?:\/\//.test(href);
}

/**
 * 导航高亮：精确匹配，或匹配路径的第一段。
 * 例：/blog/foo 会让 /blog 高亮；/ 只在首页高亮。
 */
export function isNavActive(pathname: string, href: string): boolean {
	const firstSegment = pathname.match(/[^/]+/)?.[0] ?? '';
	return href === pathname || href === `/${firstSegment}`;
}
