#!/usr/bin/env node
// Lightweight article-management CLI for the blog.
//   pnpm new    — scaffold a new post (CJK→pinyin slug + auto-numbered prefix)
//   pnpm stats  — quick inventory (count, word total, category breakdown)
//
// Deliberately plain Node + @inquirer/prompts — no ink/React TUI like koharu.
// Note: the content schema has no `draft` field, so this scaffold creates a
// published post (pubDate = now). Draft support would need a schema change +
// filtering across every listing page — kept out of scope here.
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { input } from '@inquirer/prompts';
import { slugify } from 'transliteration';
import matter from 'gray-matter';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BLOG_DIR = join(ROOT, 'src/content/blog');

async function listPosts() {
	const files = (await readdir(BLOG_DIR, { recursive: true })).filter((f) => /\.(md|mdx)$/.test(f));
	const posts = [];
	for (const f of files) {
		const raw = await readFile(join(BLOG_DIR, f), 'utf8');
		const { data } = matter(raw);
		posts.push({ file: f, id: basename(f, extname(f)), data, raw });
	}
	return posts;
}

/** Next sequence number, following the existing `N-slug.md` convention. */
function nextNumber(posts) {
	let max = 0;
	for (const p of posts) {
		const m = p.id.match(/^(\d+)/);
		if (m) max = Math.max(max, Number(m[1]));
	}
	return max + 1;
}

function existingCategories(posts) {
	const set = new Set();
	for (const p of posts) {
		const c = p.data.category;
		if (c && String(c).trim()) set.add(String(c).trim());
	}
	return [...set].sort();
}

async function newPost() {
	const posts = await listPosts();

	const title = (
		await input({ message: '标题:', validate: (v) => (v.trim() ? true : '请输入标题') })
	).trim();
	const description = (
		await input({
			message: '一句话简介（显示在卡片上）:',
			validate: (v) => (v.trim() ? true : '请输入简介'),
		})
	).trim();

	const cats = existingCategories(posts);
	const category = (
		await input({
			message: cats.length ? `分类（可留空；已有：${cats.join('、')}）:` : '分类（可留空）:',
		})
	).trim();

	const tagsInput = (await input({ message: '标签（逗号分隔，可留空）:' })).trim();
	const tags = tagsInput
		? tagsInput
				.split(/[,，]/)
				.map((t) => t.trim())
				.filter(Boolean)
		: [];

	const slug = slugify(title, { separator: '-' }) || 'post';
	const filename = `${nextNumber(posts)}-${slug}.md`;
	const filepath = join(BLOG_DIR, filename);

	try {
		await access(filepath, constants.F_OK);
		console.error(`✗ 已存在同名文件: ${filepath}`);
		process.exit(1);
	} catch {
		// not present — good
	}

	const fm = {
		title,
		description,
		pubDate: new Date().toISOString(),
		category: category || '',
	};
	if (tags.length) fm.tags = tags;

	await writeFile(filepath, matter.stringify('', fm));
	console.log(`✓ 已创建 ${filepath}`);
	console.log(`  用 pnpm dev 预览，写完后直接提交即可。`);
}

async function stats() {
	const posts = await listPosts();
	let words = 0;
	const byCat = {};
	for (const p of posts) {
		const body = p.raw.replace(/^---[\s\S]*?---/, '');
		const cn = (body.match(/[一-鿿]/g) ?? []).length;
		const en = (body.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length;
		words += cn + en;
		const c = (p.data.category && String(p.data.category).trim()) || '（未分类）';
		byCat[c] = (byCat[c] ?? 0) + 1;
	}
	console.log(`文章总数: ${posts.length}`);
	console.log(`总字数:   ${words.toLocaleString()}（中文字 + 英文词）`);
	console.log(`分类分布:`);
	for (const [c, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
		console.log(`  ${c}: ${n}`);
	}
}

const cmd = process.argv[2];
if (cmd === 'new') {
	newPost().catch((e) => {
		console.error(e?.message || e);
		process.exit(1);
	});
} else if (cmd === 'stats') {
	stats().catch((e) => {
		console.error(e?.message || e);
		process.exit(1);
	});
} else {
	console.log('用法:\n  pnpm new    新建文章\n  pnpm stats  统计概览');
}
