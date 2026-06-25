import {
	siGithub,
	siRss,
	siBilibili,
	siSteam,
	siTelegram,
	siX,
	siSinaweibo,
} from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';

export interface SocialIcon {
	label: string;
	color: string;
	svg: string;
}

const svg = (inner: string) =>
	`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${inner}</svg>`;

const brand = (icon: SimpleIcon): SocialIcon => ({
	label: icon.title,
	color: `#${icon.hex}`,
	svg: svg(`<path d="${icon.path}"/>`),
});

export const SOCIAL_ICONS: Record<string, SocialIcon> = {
	github: brand(siGithub),
	rss: brand(siRss),
	bilibili: brand(siBilibili),
	steam: brand(siSteam),
	telegram: brand(siTelegram),
	x: brand(siX),
	weibo: brand(siSinaweibo),
};
