// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = '盐木的小破窝';
export const SITE_ALTERNATE_NAME = '盐木';
export const SITE_DESCRIPTION = '盐木的个人博客，记录游戏、运维、安全与逆向工程的实践与思考';
export const SITE_AUTHOR = 'SALTWOOD';
export const SITE_AUTHOR_ALTERNATE_NAME = '盐木';
export const SITE_BIO = '咕咕咕……';
export const SITE_COORDS = '009.14°S · 159.56°E';
export const BACKGROUND_IMAGE_LIGHT = '/background-light.webp';
export const BACKGROUND_IMAGE_DARK = '/background-dark.webp';

// Visitor analytics. Flip `umami.enabled` to turn tracking on/off site-wide;
// when off, no analytics script is injected and no outbound requests are made.
export interface UmamiStatsDisplay {
	enabled: boolean;
	token: string;
}

export interface UmamiConfig {
	enabled: boolean;
	src: string;
	websiteId: string;
	statisticsDisplay?: UmamiStatsDisplay;
}

export const ANALYTICS: { umami: UmamiConfig } = {
	umami: {
		enabled: true,
		src: 'https://saltwood.top:3033/script.js',
		websiteId: 'c15bf019-58c5-4c8a-baca-331ca2674e92',
		statisticsDisplay: {
			enabled: true,
			token: '9dghBqhjRspN82mo',
		},
	},
};

export interface SocialLink {
	name: string;
	url: string;
	label?: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
	{ name: 'github', url: 'https://github.com/SALTWOOD' },
	{ name: 'rss', url: '/rss.xml' },
	{ name: 'bilibili', url: 'https://space.bilibili.com/521343512' },
];
