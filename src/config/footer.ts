export interface FooterLink {
	label: string;
	href: string;
}

export const TRAVELLINGS = {
	href: 'https://www.travellings.cn/go.html',
	logo: 'https://www.travellings.cn/assets/logo.svg',
	alt: '开往-友链接力',
};

export const BEIAN_LINKS: FooterLink[] = [
	{ label: '闽ICP备2024070515号-4', href: 'https://beian.miit.gov.cn/' },
	{ label: '公网安备35018102240084号', href: 'http://www.beian.gov.cn/' },
	{ label: '萌ICP备20250399号', href: 'https://icp.gov.moe/' },
];
