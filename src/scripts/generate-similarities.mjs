// Generate per-post semantic similarity (dense embedding + cosine) and write
// src/data/similarities.json. Each post's frontmatter title + description is
// embedded with `Snowflake/snowflake-arctic-embed-m-v2.0` (768-dim, mean-pooled
// and L2-normalized), so cosine similarity is just a dot product.
// Run with: `pnpm gen:similarities` (or --force).
//
// Output shape: { [id]: [{ id, title, score }, ...] } keyed by collection id
// (filename stem). The site imports this JSON at build time; an empty file
// means "no related posts" and the RelatedPosts block hides itself.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { pipeline, env } from '@huggingface/transformers';

// Use the official Hugging Face host by default. If huggingface.co is slow or
// unreachable from your network, set HF_ENDPOINT to a mirror (e.g.
// https://hf-mirror.com) and the model will fetch from there instead.
env.allowLocalModels = false;
env.cacheDir = join(fileURLToPath(new URL('../../', import.meta.url)), '.cache/transformers');
if (process.env.HF_ENDPOINT) env.remoteHost = process.env.HF_ENDPOINT.replace(/\/+$/, '');

const MODEL = 'Snowflake/snowflake-arctic-embed-m-v2.0';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BLOG_DIR = join(ROOT, 'src/content/blog');
const OUT_FILE = join(ROOT, 'src/data/similarities.json');
const CACHE_FILE = join(ROOT, '.cache/similarities.json');

const TOP_N = 4;
const MIN_SCORE = 0.05;
const FORCE = process.argv.includes('--force');
// Bump when the algorithm changes so the content-only cache is invalidated
// and a stale similarities.json never survives an upgrade.
const ALGO_VERSION = 'arctic-embed-m-v2';

function stripMarkdown(md) {
	return md
		.replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
		.replace(/`[^`]*`/g, ' ') // inline code
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → keep text
		.replace(/<[^>]+>/g, ' ') // raw HTML tags
		.replace(/[#>*_~\-+=|]/g, ' '); // markdown punctuation
}

async function main() {
	const files = (await readdir(BLOG_DIR, { recursive: true })).filter((f) =>
		/\.(md|mdx)$/.test(f),
	);

	const posts = [];
	for (const f of files) {
		const raw = await readFile(join(BLOG_DIR, f), 'utf8');
		const { data, content } = matter(raw);
		posts.push({
			id: basename(f, extname(f)),
			raw,
			title: data.title ?? basename(f, extname(f)),
			tags: data.tags ?? [],
			category: data.category ?? '',
			description: data.description ?? '',
			body: content,
		});
	}

	if (posts.length === 0) {
		console.log('No posts found.');
		return;
	}

	// Skip work when nothing changed (unless --force).
	const contentHash = createHash('md5')
		.update(posts.map((p) => p.raw).join('\n'))
		.digest('hex');
	if (!FORCE && existsSync(CACHE_FILE)) {
		try {
			const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
			if (cached.hash === contentHash && cached.algo === ALGO_VERSION) {
				console.log('No content changes since last run — skipping. (use --force to override)');
				return;
			}
		} catch {}
	}

	// Load the model once. Title + description discriminates far better than
	// including the body (Chinese technical bodies share a lot of boilerplate
	// vocabulary that collapses the embedding space), so we embed frontmatter
	// only. The body / stripMarkdown() helper stays available for other uses.
	console.log(`Loading model ${MODEL} ...`);
	const extractor = await pipeline('feature-extraction', MODEL);

	const embeddings = [];
	for (let i = 0; i < posts.length; i++) {
		const p = posts[i];
		// Note: src/data/summaries.json could be used as the description source
		// here in future, if AI summaries are generated and preferred over the
		// hand-written frontmatter description.
		const input = `${p.title}. ${p.description || ''}`;
		const output = await extractor(input, { pooling: 'mean', normalize: true });
		// Transformers.js v4: the pooled/normalized result is a Tensor whose
		// `.data` iterable yields the 768 components.
		embeddings.push(Array.from(output.data));
		if ((i + 1) % 5 === 0 || i === posts.length - 1) {
			console.log(`  embedded ${i + 1}/${posts.length} ...`);
		}
	}

	const DIM = embeddings[0]?.length ?? 768;

	// Cosine = dot product (vectors are already unit-length).
	const dot = (a, b) => {
		let s = 0;
		for (let i = 0; i < DIM; i++) s += a[i] * b[i];
		return s;
	};

	const out = {};
	for (let i = 0; i < posts.length; i++) {
		const p = posts[i];
		out[p.id] = posts
			.map((q, j) => (q.id === p.id ? null : { id: q.id, title: q.title, score: Number(dot(embeddings[i], embeddings[j]).toFixed(4)) }))
			.filter(Boolean)
			.filter((s) => s.score >= MIN_SCORE)
			.sort((a, b) => b.score - a.score)
			.slice(0, TOP_N);
	}

	await mkdir(dirname(OUT_FILE), { recursive: true });
	await writeFile(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`);
	await mkdir(dirname(CACHE_FILE), { recursive: true });
	await writeFile(CACHE_FILE, JSON.stringify({ hash: contentHash, algo: ALGO_VERSION }));

	const withRelated = Object.values(out).filter((a) => a.length > 0).length;
	console.log(`✓ Wrote ${OUT_FILE}`);
	console.log(`  ${posts.length} posts indexed, ${withRelated} have related entries (top ${TOP_N}, score ≥ ${MIN_SCORE}).`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
