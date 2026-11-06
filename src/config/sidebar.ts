import { isExternal, labelFor, navFor } from './nav';

export interface NavItem {
	label: string;
	href: string;
	external?: boolean;
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

export const homeSidebar: SidebarBlock[] = [
	{ type: 'author' },
	{ type: 'site-stats' },
	{
		type: 'nav',
		title: '导航',
		items: navFor('sidebar').map((destination) => ({
			label: labelFor(destination, 'sidebar'),
			href: destination.href,
			external: isExternal(destination.href),
		})),
	},
];

export const articleSidebar: SidebarBlock[] = [
	{ type: 'author' },
	{ type: 'reading-stats' },
	{ type: 'recent', count: 4 },
];
