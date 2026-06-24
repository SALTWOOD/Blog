// Generate short AI summaries for each post (title + summary) and write
// src/data/summaries.json. Sends the post body to an OpenAI-compatible LOCAL
// LLM (default: LM Studio at 127.0.0.1:1232/v1) and asks for a 2-3 sentence
// Chinese summary. Standalone — NOT wired into the similarity pipeline (that
// still uses the frontmatter `description`); this exists so summaries can be
// enabled later. Run with: `pnpm gen:summaries` (or --force).
//
// Output shape: { [id]: { title, summary } } keyed by filename stem.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BLOG_DIR = join(ROOT, 'src/content/blog');
const OUT_FILE = join(ROOT, 'src/data/summaries.json');
const CACHE_FILE = join(ROOT, '.cache/summaries.json');

const BASE_URL = (process.env.LLM_BASE_URL || 'http://127.0.0.1:1234/v1').replace(/\/+$/, '');
const API_KEY = process.env.LLM_API_KEY || 'sk-local-placeholder';
const MODEL = process.env.LLM_MODEL || 'local-model';
const FORCE = process.argv.includes('--force');
// Bump when the prompt/format changes so the cache invalidates.
const VERSION = 'openai-v1';

const MAX_CHARS = 12000; // cap body length sent to the model

function stripMarkdown(md) {
	return md
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/<[^>]+>/g, ' ')
		.replace(/[#>*_~\-+=|]/g, ' ');
}

async function probe(baseUrl) {
	try {
		const res = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${API_KEY}` } });
		if (!res.ok) return false;
		const data = await res.json();
		const models = (data?.data ?? []).map((m) => m.id).filter(Boolean);
		if (models.length > 0) console.log(`  model(s) available: ${models.join(', ')}`);
		return true;
	} catch {
		return false;
	}
}

async function summarize(post, model) {
	const body = stripMarkdown(post.body).replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
	const res = await fetch(`${BASE_URL}/chat/completions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
		body: JSON.stringify({
			model,
			temperature: 0.3,
			max_tokens: 200,
			messages: [
				{
					role: 'system',
					content: '你是技术博客摘要助手。用简明的中文概括文章核心内容，2-3 句话，直接输出摘要，不要前言、不要“摘要：”之类的引导词、不要展示思考过程。',
				},
				{
					role: 'user',
					content: `标题：${post.title}\n\n正文：\n${body}`,
				},
			],
		}),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 200)}`);
	}
	const data = await res.json();
	const summary = data?.choices?.[0]?.message?.content?.trim();
	if (!summary) throw new Error('LLM returned empty content');
	return summary;
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
			body: content,
		});
	}

	if (posts.length === 0) {
		console.log('No posts found.');
		return;
	}

	console.log(`Probing LLM at ${BASE_URL} ...`);
	const ok = await probe(BASE_URL);
	if (!ok) {
		console.error(`✗ Could not reach the LLM server at ${BASE_URL}/models.`);
		console.error('  Start your local LLM server, e.g. LM Studio / Ollama,');
		console.error('  or override with the LLM_BASE_URL env var.');
		process.exit(2);
	}

	// Load cache (version/model change → regenerate all).
	let cache = { version: VERSION, model: MODEL, entries: {} };
	if (existsSync(CACHE_FILE)) {
		try {
			cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
			cache.entries = cache.entries ?? {};
		} catch {
			cache = { version: VERSION, model: MODEL, entries: {} };
		}
	}
	const cacheInvalid = cache.version !== VERSION || cache.model !== MODEL;

	const out = {};
	let done = 0;
	for (const p of posts) {
		const hash = createHash('md5').update(p.raw).digest('hex');
		const entry = cache.entries[p.id];
		const usable = !FORCE && !cacheInvalid && entry?.hash === hash && entry?.summary;
		if (usable) {
			out[p.id] = { title: p.title, summary: entry.summary };
			continue;
		}
		try {
			const summary = await summarize(p, MODEL);
			out[p.id] = { title: p.title, summary };
			cache.entries[p.id] = { hash, title: p.title, summary };
			done++;
			console.log(`  ✓ ${p.id}`);
		} catch (err) {
			console.error(`  ✗ ${p.id}: ${err.message}`);
			// Fall back to any cached summary we may already have, else skip.
			if (entry?.summary) out[p.id] = { title: p.title, summary: entry.summary };
		}
	}

	await mkdir(dirname(OUT_FILE), { recursive: true });
	await writeFile(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`);
	await mkdir(dirname(CACHE_FILE), { recursive: true });
	await writeFile(CACHE_FILE, JSON.stringify({ version: VERSION, model: MODEL, entries: cache.entries }, null, 2));

	console.log(`✓ Wrote ${OUT_FILE}`);
	console.log(`  ${posts.length} posts, ${done} summarized this run (${Object.keys(out).length} total in output).`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
