import { authorPerson } from '../lib/schema';
import { SITE_ALTERNATE_NAME, SITE_DESCRIPTION, SITE_TITLE } from './site';

export function websiteJsonLd(site?: URL) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_TITLE,
		alternateName: SITE_ALTERNATE_NAME,
		url: new URL('/', site).href,
		description: SITE_DESCRIPTION,
		inLanguage: 'zh-CN',
		publisher: authorPerson(site),
	};
}
