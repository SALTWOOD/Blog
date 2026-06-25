import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			tags: z.array(z.string()).default([]),
			category: z.string().optional(),
			// 0 = not pinned; higher number floats the post to the top of the
			// homepage featured block. Default 0 so existing posts are unaffected.
			pinned: z.number().default(0),
			// Source-level encryption (see src/lib/crypto). When `encrypted` is
			// true the body lives only as ciphertext in `encMd`; `wrappedKey` is
			// the data key wrapped by the repo's RSA public key, `ivMd` the GCM
			// IV. None of these ship to the browser as-is — the build decrypts
			// for rendering, then re-encrypts the rendered HTML.
			encrypted: z.boolean().optional(),
			encMd: z.string().optional(),
			wrappedKey: z.string().optional(),
			ivMd: z.string().optional(),
		}),
});

export const collections = { blog };
