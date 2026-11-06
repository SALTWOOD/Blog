export interface OcField {
	label: string;
	value: string;
}

export interface OcSection {
	title: string;
	en?: string;
	body: string[];
}

export interface OcImage {
	src: string;
	alt: string;
	caption?: string;
}

export interface OcProfile {
	name: string;
	tagline: string;
	intro: string;
	image: string;
	imageAlt: string;
	fields: OcField[];
	tags: string[];
	sections: OcSection[];
	gallery: OcImage[];
}

export interface ArtPiece {
	src: string;
	alt: string;
	title?: string;
	caption?: string;
}

export const OC: OcProfile = {
	name: '名字',
	tagline: '请输入文本',
	intro: '',
	image: '',
	imageAlt: '立绘',
	fields: [],
	tags: [],
	sections: [],
	gallery: [],
};

export const ARTWORKS: ArtPiece[] = [
	...(OC.image ? [{ src: OC.image, alt: OC.imageAlt, title: OC.name }] : []),
	...OC.gallery.map((item) => ({
		src: item.src,
		alt: item.alt,
		title: item.caption ?? OC.name,
		caption: item.caption,
	})),
];
