// Generate per-post semantic similarity (TF-IDF + cosine) and write
// src/data/similarities.json. Pure JS, no model download — fits the blog's
// lean, hand-rolled ethos. Run with: `pnpm gen:similarities` (or --force).
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

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BLOG_DIR = join(ROOT, 'src/content/blog');
const OUT_FILE = join(ROOT, 'src/data/similarities.json');
const CACHE_FILE = join(ROOT, '.cache/similarities.json');

const TOP_N = 4;
const MIN_SCORE = 0.05;
const FORCE = process.argv.includes('--force');

// Tiny English stopword list; TF-IDF naturally down-weights common CJK bigrams.
const STOP = new Set(
	'the a an of to in on for and or but is are was were be been being it its this that these those with from by at as into your you i we they he she his her our their not no if then than so do does did has have had can could will would should may might must about over under'.split(
		' ',
	),
);

function stripMarkdown(md) {
	return md
		.replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
		.replace(/`[^`]*`/g, ' ') // inline code
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → keep text
		.replace(/<[^>]+>/g, ' ') // raw HTML tags
		.replace(/[#>*_~\-+=|]/g, ' '); // markdown punctuation
}

/** Tokenize: Latin words (lowercased, stopwords/short dropped) + CJK bigrams. */
function tokenize(text) {
	const counts = new Map();
	const add = (t) => counts.set(t, (counts.get(t) ?? 0) + 1);
	for (const w of text.toLowerCase().match(/[a-z][a-z0-9]{1,}/g) ?? []) {
		if (!STOP.has(w)) add(w);
	}
	for (const run of text.match(/[一-鿿]+/g) ?? []) {
		for (let i = 0; i < run.length - 1; i++) add(run.slice(i, i + 2));
	}
	return counts;
}

/** Build a weighted text profile: title ×3, tags/category ×2, body ×1. */
function profile(post) {
	const parts = [post.title, post.title, post.title];
	for (let i = 0; i < 2; i++) parts.push(...(post.tags ?? []), post.category ?? '');
	parts.push(stripMarkdown(post.body));
	return tokenize(parts.join(' '));
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
			if (cached.hash === contentHash) {
				console.log('No content changes since last run — skipping. (use --force to override)');
				return;
			}
		} catch {}
	}

	// TF-IDF: term frequency × inverse document frequency.
	const N = posts.length;
	const df = new Map();
	for (const p of posts) {
		p.tf = profile(p);
		for (const term of p.tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
	}
	const idf = (term) => Math.log((N + 1) / ((df.get(term) ?? 1) + 1) + 1);

	for (const p of posts) {
		p.vec = new Map();
		for (const [term, tf] of p.tf) p.vec.set(term, tf * idf(term));
		let sum = 0;
		for (const v of p.vec.values()) sum += v * v;
		p.norm = Math.sqrt(sum);
	}

	const cosine = (a, b) => {
		const [x, y] = a.vec.size < b.vec.size ? [a, b] : [b, a];
		let dot = 0;
		for (const [t, v] of x.vec) {
			const w = y.vec.get(t);
			if (w) dot += v * w;
		}
		const denom = a.norm * b.norm;
		return denom ? dot / denom : 0;
	};

	const out = {};
	for (const p of posts) {
		out[p.id] = posts
			.filter((q) => q.id !== p.id)
			.map((q) => ({ id: q.id, title: q.title, score: Number(cosine(p, q).toFixed(4)) }))
			.filter((s) => s.score >= MIN_SCORE)
			.sort((a, b) => b.score - a.score)
			.slice(0, TOP_N);
	}

	await mkdir(dirname(OUT_FILE), { recursive: true });
	await writeFile(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`);
	await mkdir(dirname(CACHE_FILE), { recursive: true });
	await writeFile(CACHE_FILE, JSON.stringify({ hash: contentHash }));

	const withRelated = Object.values(out).filter((a) => a.length > 0).length;
	console.log(`✓ Wrote ${OUT_FILE}`);
	console.log(`  ${posts.length} posts indexed, ${withRelated} have related entries (top ${TOP_N}, score ≥ ${MIN_SCORE}).`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
