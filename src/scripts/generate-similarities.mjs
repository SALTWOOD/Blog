// Generate per-post semantic similarity (TF-IDF + cosine) and write
// src/data/similarities.json. Chinese is segmented with @node-rs/jieba
// (prebuilt native binding — no compilation); English is regex-tokenized.
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
import { Jieba } from '@node-rs/jieba';
import { dict } from '@node-rs/jieba/dict.js';

// Load the default dictionary once; HMM stays on for out-of-dict words.
const jieba = Jieba.withDict(dict);

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BLOG_DIR = join(ROOT, 'src/content/blog');
const OUT_FILE = join(ROOT, 'src/data/similarities.json');
const CACHE_FILE = join(ROOT, '.cache/similarities.json');

const TOP_N = 4;
const MIN_SCORE = 0.05;
const FORCE = process.argv.includes('--force');
// Bump when the algorithm changes so the content-only cache is invalidated
// and a stale similarities.json never survives an upgrade.
const ALGO_VERSION = 'jieba-v1';

// English function words; jieba handles Chinese segmentation below.
const STOP = new Set(
	'the a an of to in on for and or but is are was were be been being it its this that these those with from by at as into your you i we they he she his her our their not no if then than so do does did has have had can could will would should may might must about over under'.split(
		' ',
	),
);

// Chinese particles / pronouns / connectives that carry no topic signal.
// Single characters are dropped wholesale in tokenize(), so only multi-char
// stopphrases need to be listed here.
const STOP_ZH = new Set([
	'我们', '你们', '他们', '她们', '它们', '什么', '怎么', '为什么', '怎样',
	'这个', '那个', '这些', '那些', '这样', '那样', '这里', '那里', '哪个',
	'一个', '一些', '一切', '其他', '其它', '其余', '没有', '不是', '不能',
	'不会', '不要', '可以', '能够', '应该', '已经', '正在', '还是', '就是',
	'只是', '只有', '只要', '或者', '但是', '不过', '而且', '并且', '以及',
	'因为', '所以', '如果', '虽然', '然后', '当然', '其实', '可能', '觉得',
	'以为', '现在', '以前', '以后', '时候', '地方', '东西', '问题', '方面',
	'情况', '样子', '大家', '自己',
]);

function stripMarkdown(md) {
	return md
		.replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
		.replace(/`[^`]*`/g, ' ') // inline code
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → keep text
		.replace(/<[^>]+>/g, ' ') // raw HTML tags
		.replace(/[#>*_~\-+=|]/g, ' '); // markdown punctuation
}

/** Tokenize: Latin words (lowercased, stopwords/short dropped) + Chinese
 *  words via jieba (single chars and stopphrases dropped). Returns term→count. */
function tokenize(text) {
	const counts = new Map();
	const add = (t) => counts.set(t, (counts.get(t) ?? 0) + 1);
	for (const w of text.toLowerCase().match(/[a-z][a-z0-9]{1,}/g) ?? []) {
		if (!STOP.has(w)) add(w);
	}
	for (const run of text.match(/[\p{Script=Han}]+/gu) ?? []) {
		for (const w of jieba.cut(run, true)) {
			if (w.length >= 2 && !STOP_ZH.has(w)) add(w);
		}
	}
	return counts;
}

/** Build a weighted text profile: title ×3, tags/category/description ×2, body ×1. */
function profile(post) {
	const parts = [post.title, post.title, post.title];
	for (let i = 0; i < 2; i++) parts.push(...(post.tags ?? []), post.category ?? '', post.description ?? '');
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
		// Sublinear TF scaling: 1 + log10(tf) dampens repeated-term dominance.
		for (const [term, tf] of p.tf) p.vec.set(term, (1 + Math.log10(tf)) * idf(term));
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
	await writeFile(CACHE_FILE, JSON.stringify({ hash: contentHash, algo: ALGO_VERSION }));

	const withRelated = Object.values(out).filter((a) => a.length > 0).length;
	console.log(`✓ Wrote ${OUT_FILE}`);
	console.log(`  ${posts.length} posts indexed, ${withRelated} have related entries (top ${TOP_N}, score ≥ ${MIN_SCORE}).`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
