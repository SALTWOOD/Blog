import { TRAVELLINGS } from './footer';

export type NavSurface = 'header' | 'mobile' | 'sidebar' | 'home';

export interface NavDestination {
	id: string;
	label: string;
	href: string;
	icon?: string;
	labels?: Partial<Record<NavSurface, string>>;
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
		id: 'artworks',
		label: '作品',
		href: '/artworks',
		icon: 'palette',
		place: { header: 15, mobile: 15, sidebar: 15, home: 15 },
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

export function navFor(surface: NavSurface): NavDestination[] {
	return NAV.filter((destination) => destination.place[surface] !== undefined).sort(
		(a, b) => a.place[surface]! - b.place[surface]!,
	);
}

export function labelFor(destination: NavDestination, surface: NavSurface): string {
	return destination.labels?.[surface] ?? destination.label;
}

export function isExternal(href: string): boolean {
	return /^https?:\/\//.test(href);
}

export function isNavActive(pathname: string, href: string): boolean {
	const firstSegment = pathname.match(/[^/]+/)?.[0] ?? '';
	return href === pathname || href === `/${firstSegment}`;
}
