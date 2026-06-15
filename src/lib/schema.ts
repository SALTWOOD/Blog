import { SITE_AUTHOR, SITE_AUTHOR_ALTERNATE_NAME } from '../consts';

/**
 * schema.org Person representing the site author, reused as both
 * `author` and `publisher` across the site's JSON-LD. The profile URL
 * resolves against the given site origin (Astro.site).
 */
export function authorPerson(site?: URL) {
	return {
		'@type': 'Person',
		name: SITE_AUTHOR,
		alternateName: SITE_AUTHOR_ALTERNATE_NAME,
		url: new URL('/about/', site).href,
	};
}
