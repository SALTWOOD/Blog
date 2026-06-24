// Generate per-post similarity via HYBRID retrieval — BM25 over the body +
// multilingual dense embeddings — fused with Reciprocal Rank Fusion (RRF).
// Run with: `pnpm gen:similarities` (or --force).
//
// Why hybrid: a single channel can't satisfy "use the body, don't miss
// details, AND stay cross-lingual". BM25 (sparse) reads the full body and
// catches lexical/detail matches but is word-bound (no cross-lingual). Dense
// embeddings (multilingual) catch semantic/synonym/cross-lingual matches but
// collapse if fed a long raw body — so the body is chunked + mean-pooled. RRF
// fuses the two rankings; being rank-based it needs no score normalization
// across BM25's unbounded scores and cosine's 0–1.
//
// Body (not frontmatter description) drives both channels; description is
// deliberately unused.
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
import { pipeline, env } from '@huggingface/transformers';

// Chinese segmentation for the BM25 channel (default dict, HMM on).
const jieba = Jieba.withDict(dict);

// Official Hugging Face host by default. If huggingface.co is slow or
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
const FORCE = process.argv.includes('--force');
// Bump when the algorithm changes so the content-only cache is invalidated
// and a stale similarities.json never survives an upgrade.
const ALGO_VERSION = 'hybrid-bm25-dense-v1';

// BM25 parameters.
const K1 = 1.5;
const B = 0.75;
// RRF constant (standard 60).
const RRF_K = 30;
// Dense chunk size (~chars). Keeps each chunk under the model's token window;
// multiple chunks are mean-pooled into one doc vector.
const CHUNK_CHARS = 350;

// English function words; jieba handles Chinese segmentation below.
const STOP = new Set(
	'the a an of to in on for and or but is are was were be been being it its this that these those with from by at as into your you i we they he she his her our their not no if then than so do does did has have had can could will would should may might must about over under use using used get set see also'.split(
		' ',
	),
);
// Chinese particles / pronouns / connectives that carry no topic signal.
// Single characters are dropped wholesale in tokenize(), so only multi-char
// stopphrases need to be listed here.
const STOP_ZH = new Set([
	'我们', '你们', '他们', '她们', '它们', '什么', '怎么', '为什么', '这个', '那个',
	'这些', '那些', '这样', '那样', '一个', '一些', '其他', '其余', '没有', '不是',
	'不能', '不会', '不要', '可以', '能够', '应该', '已经', '正在', '还是', '就是',
	'只是', '只有', '或者', '但是', '不过', '而且', '并且', '以及', '因为', '所以',
	'如果', '虽然', '然后', '当然', '其实', '可能', '现在', '以后', '时候', '地方',
	'东西', '问题', '方面', '情况', '大家', '自己',
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

/** Tokenize for BM25: Latin words (lowercased, stopwords/short dropped) +
 *  Chinese words via jieba (single chars + stopphrases dropped). Returns term→tf. */
function tokenize(text) {
	const tf = new Map();
	const add = (t) => tf.set(t, (tf.get(t) ?? 0) + 1);
	for (const w of text.toLowerCase().match(/[a-z][a-z0-9]{1,}/g) ?? []) {
		if (!STOP.has(w)) add(w);
	}
	for (const run of text.match(/[\p{Script=Han}]+/gu) ?? []) {
		for (const w of jieba.cut(run, true)) {
			if (w.length >= 2 && !STOP_ZH.has(w)) add(w);
		}
	}
	return tf;
}

/** Split text into chunks of ~max chars on sentence/newline/space boundaries. */
function chunkText(text, max) {
	const out = [];
	let s = text;
	while (s.length > max) {
		let c = s.lastIndexOf('。', max);
		if (c <= 0) c = s.lastIndexOf('\n', max);
		if (c <= 0) c = s.lastIndexOf(' ', max);
		if (c <= 0) c = max;
		out.push(s.slice(0, c));
		s = s.slice(c);
	}
	if (s.trim()) out.push(s);
	return out;
}

async function main() {
	const files = (await readdir(BLOG_DIR, { recursive: true })).filter((f) => /\.(md|mdx)$/.test(f));

	const posts = [];
	for (const f of files) {
		const raw = await readFile(join(BLOG_DIR, f), 'utf8');
		const { data, content } = matter(raw);
		posts.push({
			id: basename(f, extname(f)),
			raw,
			title: data.title ?? basename(f, extname(f)),
			tags: data.tags ?? [],
			body: content,
		});
	}

	if (posts.length === 0) {
		console.log('No posts found.');
		return;
	}

	// Skip work when nothing changed (unless --force).
	const contentHash = createHash('md5').update(posts.map((p) => p.raw).join('\n')).digest('hex');
	if (!FORCE && existsSync(CACHE_FILE)) {
		try {
			const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
			if (cached.hash === contentHash && cached.algo === ALGO_VERSION) {
				console.log('No content changes since last run — skipping. (use --force to override)');
				return;
			}
		} catch {}
	}

	// ── Sparse channel: BM25 over title + tags + body ──────────────────────
	console.log('Tokenizing for BM25 ...');
	const docs = posts.map((p) => {
		const tf = tokenize([p.title, ...(p.tags ?? []), stripMarkdown(p.body)].join(' '));
		let dl = 0;
		for (const v of tf.values()) dl += v;
		return { tf, dl };
	});
	const N = posts.length;
	const avgdl = docs.reduce((s, d) => s + d.dl, 0) / N;
	const df = new Map();
	for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
	// Lucene-style smoothed IDF (always ≥ 0).
	const idf = (t) => Math.log((N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5) + 1);
	// Restrict the BM25 query to each post's top-K most distinctive terms (by
	// tf·idf). Using the whole body as the query lets the many shared generic
	// words (问题/排查/修复/配置…) out-score the few distinctive ones, so a game
	// guide could outrank a genuinely related .NET post. Capping to the top-K
	// distinctive terms keeps the query focused.
	const K_QUERY = 30;
	const queryTerms = docs.map((d) => {
		const ranked = [...d.tf.entries()].map(([t, f]) => [t, f * idf(t)]).sort((a, b) => b[1] - a[1]);
		return new Set(ranked.slice(0, K_QUERY).map(([t]) => t));
	});
	// BM25 score of candidate doc j, using anchor post i's top terms as the query.
	const bm25 = (i, j) => {
		const d = docs[j];
		let s = 0;
		for (const t of queryTerms[i]) {
			const f = d.tf.get(t);
			if (!f) continue;
			s += idf(t) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.dl) / avgdl)));
		}
		return s;
	};

	// ── Dense channel: arctic-embed on title + body, chunked mean-pool ─────
	console.log(`Loading model ${MODEL} ...`);
	const extractor = await pipeline('feature-extraction', MODEL);
	const vecs = [];
	for (let i = 0; i < posts.length; i++) {
		const p = posts[i];
		const text = `${p.title}. ${stripMarkdown(p.body).replace(/\s+/g, ' ').trim()}`;
		const chunkVecs = [];
		for (const c of chunkText(text, CHUNK_CHARS)) {
			const o = await extractor(c, { pooling: 'mean', normalize: true });
			chunkVecs.push(Float32Array.from(o.data));
		}
		// Mean-pool chunk vectors, then L2-renormalize → one unit doc vector.
		const dim = chunkVecs[0].length;
		const acc = new Float32Array(dim);
		for (const v of chunkVecs) for (let k = 0; k < dim; k++) acc[k] += v[k];
		let norm = 0;
		for (let k = 0; k < dim; k++) {
			acc[k] /= chunkVecs.length;
			norm += acc[k] * acc[k];
		}
		norm = Math.sqrt(norm) || 1;
		for (let k = 0; k < dim; k++) acc[k] /= norm;
		vecs.push(acc);
		if ((i + 1) % 5 === 0 || i === posts.length - 1) console.log(`  embedded ${i + 1}/${posts.length} ...`);
	}
	const DIM = vecs[0]?.length ?? 768;
	const cos = (a, b) => {
		let s = 0;
		for (let i = 0; i < DIM; i++) s += a[i] * b[i];
		return s;
	};

	// ── RRF fusion per anchor post ─────────────────────────────────────────
	const out = {};
	for (let i = 0; i < posts.length; i++) {
		const idx = posts.map((_, j) => j).filter((j) => j !== i);
		// Rank candidates under each channel (1-based).
		const sparseRank = new Map();
		idx.map((j) => ({ j, s: bm25(i, j) })).sort((a, b) => b.s - a.s).forEach((e, r) => sparseRank.set(e.j, r + 1));
		const denseRank = new Map();
		idx.map((j) => ({ j, s: cos(vecs[i], vecs[j]) })).sort((a, b) => b.s - a.s).forEach((e, r) => denseRank.set(e.j, r + 1));

		out[posts[i].id] = idx
			.map((j) => ({
				id: posts[j].id,
				title: posts[j].title,
				score: Number((1 / (RRF_K + sparseRank.get(j)) + 1 / (RRF_K + denseRank.get(j))).toFixed(4)),
			}))
			.sort((a, b) => b.score - a.score)
			.slice(0, TOP_N);
	}

	await mkdir(dirname(OUT_FILE), { recursive: true });
	await writeFile(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`);
	await mkdir(dirname(CACHE_FILE), { recursive: true });
	await writeFile(CACHE_FILE, JSON.stringify({ hash: contentHash, algo: ALGO_VERSION }));

	const withRelated = Object.values(out).filter((a) => a.length > 0).length;
	console.log(`✓ Wrote ${OUT_FILE}`);
	console.log(`  ${posts.length} posts indexed, ${withRelated} have related entries (top ${TOP_N}, BM25+dense RRF).`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
