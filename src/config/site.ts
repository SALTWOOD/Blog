export const SITE_TITLE = '盐林格勒';
export const SITE_WORDMARK = 'SALTWOOD';
export const SITE_KICKER = 'Салтлинград';
export const SITE_ALTERNATE_NAME = '盐木';
export const SITE_DESCRIPTION = '梦想是成为一位厉害的曲师！ヽ(≧∀≦)ﾉ';
export const SITE_AUTHOR = 'SALTWOOD';
export const SITE_AUTHOR_ALTERNATE_NAME = '盐木';
export const SITE_BIO = '咕咕咕……';
export const BACKGROUND_IMAGE_LIGHT = '/background-light.webp';
export const BACKGROUND_IMAGE_DARK = '/background-dark.webp';

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
		src: 'https://stats.ski.ink/script.js',
		websiteId: '97184747-f3f3-4a0b-83ed-9a08f53822b9',
		statisticsDisplay: {
			enabled: true,
			token: 'r5NQXnxyztwkp4WQ',
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
