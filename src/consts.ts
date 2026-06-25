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
