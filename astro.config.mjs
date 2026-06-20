// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import { unified } from '@astrojs/markdown-remark';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://blog.ski.ink',
	redirects: {
		'/blog': '/',
	},
	integrations: [mdx(), sitemap(), pagefind()],
	markdown: {
		processor: unified({ remarkPlugins: [remarkAlert] }),
	},
	fonts: [
		{
			// Display / headings — characterful optical-size serif (logbook voice)
			provider: fontProviders.local(),
			name: 'Fraunces',
			cssVariable: '--font-display',
			fallbacks: ['Georgia', 'Cambria', '"PingFang SC"', '"Microsoft YaHei"', 'serif'],
			options: {
				variants: [
					{ src: ['./src/assets/fonts/fraunces-400.woff2'], weight: 400, style: 'normal', display: 'swap' },
					{ src: ['./src/assets/fonts/fraunces-600.woff2'], weight: 600, style: 'normal', display: 'swap' },
				],
			},
		},
		{
			// Body / UI — technical sans, pairs with the serif
			provider: fontProviders.local(),
			name: 'IBM Plex Sans',
			cssVariable: '--font-body',
			fallbacks: ['"Helvetica Neue"', 'Helvetica', '"PingFang SC"', '"Microsoft YaHei"', 'Arial', 'sans-serif'],
			options: {
				variants: [
					{ src: ['./src/assets/fonts/ibm-plex-sans-400.woff2'], weight: 400, style: 'normal', display: 'swap' },
					{ src: ['./src/assets/fonts/ibm-plex-sans-500.woff2'], weight: 500, style: 'normal', display: 'swap' },
					{ src: ['./src/assets/fonts/ibm-plex-sans-600.woff2'], weight: 600, style: 'normal', display: 'swap' },
					{ src: ['./src/assets/fonts/ibm-plex-sans-700.woff2'], weight: 700, style: 'normal', display: 'swap' },
				],
			},
		},
	],
});
