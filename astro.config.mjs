// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';
import remarkDirective from 'remark-directive';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { defineConfig, fontProviders } from 'astro/config';
import { shikiMetaTransformer } from './src/lib/markdown/shiki-meta';
import { rehypeFigure } from './src/lib/markdown/rehype-figure';
import { remarkFold } from './src/lib/markdown/remark-fold';
import { remarkTabs } from './src/lib/markdown/remark-tabs';
import { remarkCdnImages } from './src/lib/markdown/remark-cdn-images';
import { remarkDecrypt } from './src/lib/markdown/remark-decrypt';
import { remarkDirectiveText } from './src/lib/markdown/remark-directive-text';
import { rehypeReencrypt } from './src/lib/markdown/rehype-reencrypt';

// https://astro.build/config
export default defineConfig({
	site: 'https://ski.ink',
	redirects: {
		'/about': '/#about',
	},
	integrations: [mdx(), sitemap(), pagefind(), vue()],
	vite: {
		plugins: [tailwindcss()],
	},
	markdown: {
		syntaxHighlight: 'shiki',
		remarkPlugins: [
			remarkDecrypt,
			remarkCdnImages,
			remarkAlert,
			remarkDirective,
			// After remarkDirective: turns stray `:00` / `std::` text directives
			// back into literal text so prose colons are not eaten as markup.
			remarkDirectiveText,
			remarkFold,
			remarkTabs,
		],
		rehypePlugins: [rehypeFigure, rehypeReencrypt],
		shikiConfig: {
			transformers: [shikiMetaTransformer()],
		},
	},
	fonts: [
		{
			// Display / headings — characterful optical-size serif (logbook voice)
			provider: fontProviders.local(),
			name: 'Fraunces',
			cssVariable: '--font-accent',
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
