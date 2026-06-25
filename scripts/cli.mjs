#!/usr/bin/env node
// Lightweight article-management CLI for the blog.
//   pnpm new      — scaffold a new post (CJK→pinyin slug + auto-numbered prefix)
//   pnpm pin      — toggle the pinned/featured priority of an existing post
//   pnpm stats    — quick inventory (count, word total, category breakdown)
//   pnpm keygen   — generate the RSA key pair used for article encryption
//   pnpm lock     — encrypt a post's body in place (ciphertext stays in repo,
//                   plaintext body is removed)
//   pnpm unlock   — restore a post's plaintext body from its ciphertext
//
// Deliberately plain Node + @inquirer/prompts — no ink/React TUI.
// Note: the content schema has no `draft` field, so this scaffold creates a
// published post (pubDate = now). Draft support would need a schema change +
// filtering across every listing page — kept out of scope here.
import { readdir, readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { existsSync, constants } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { input, select, number, confirm } from '@inquirer/prompts';
import { slugify } from 'transliteration';
import matter from 'gray-matter';
import {
	bytesToBase64,
	decryptString,
	encryptString,
	generateDataKey,
	generateIV,
	generateKeyPairPems,
	importPrivateKey,
	importPublicKey,
	unwrapDataKey,
	wrapDataKey,
} from '../src/lib/crypto/index.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BLOG_DIR = join(ROOT, 'src/content/blog');
const PUBLIC_KEY_PATH = join(ROOT, 'src/keys/public.pem');
const DEFAULT_PRIVATE_KEY_PATH = join(ROOT, '.blog-private.pem');

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

	const pinnedInput = await number({
		message: '置顶优先级（0=不置顶，数字越大越靠前）:',
		default: 0,
		validate: (v) => v == null || (Number.isInteger(v) && v >= 0) || '请输入 0 或正整数',
	});
	const pinned = Number.isFinite(pinnedInput) ? Math.max(0, Math.floor(pinnedInput)) : 0;

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
	if (pinned) fm.pinned = pinned;

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

async function setPin() {
	const posts = await listPosts();
	if (!posts.length) {
		console.log('还没有文章。');
		return;
	}
	// Pinned first (higher priority first), then by numeric id desc — so the
	// posts you're most likely pinning sit near the top of the list.
	posts.sort((a, b) => {
		const pa = Number(a.data.pinned) || 0;
		const pb = Number(b.data.pinned) || 0;
		if (pb !== pa) return pb - pa;
		return b.id.localeCompare(a.id, 'en', { numeric: true });
	});

	const post = await select({
		message: '选择要置顶/取消置顶的文章:',
		choices: posts.map((p) => ({
			name: `${p.data.title ?? p.id}  ${Number(p.data.pinned) ? `(已置顶 p=${p.data.pinned})` : ''}`.trim(),
			value: p,
			description: p.file,
		})),
	});

	const current = Number(post.data.pinned) || 0;
	const next = await number({
		message: '置顶优先级（0=不置顶，数字越大越靠前）:',
		default: current,
		validate: (v) => v == null || (Number.isInteger(v) && v >= 0) || '请输入 0 或正整数',
	});
	const priority = Number.isFinite(next) ? Math.max(0, Math.floor(next)) : current;

	// Round-trip via gray-matter so the post body is preserved verbatim and we
	// only touch the frontmatter. Drop the key entirely when 0 to keep files clean.
	const parsed = matter(post.raw);
	if (priority > 0) parsed.data.pinned = priority;
	else delete parsed.data.pinned;
	await writeFile(join(BLOG_DIR, post.file), matter.stringify(parsed.content, parsed.data));

	console.log(
		priority > 0 ? `✓ ${post.id} 已置顶 (p=${priority})` : `✓ ${post.id} 已取消置顶`,
	);
}

// ── Encryption ────────────────────────────────────────────────────────────────

/** Resolve a private key PEM: env var → env-file path → default repo path. */
async function readPrivateKeyPemForCli() {
	const inline = process.env.BLOG_PRIVATE_KEY;
	if (inline && inline.trim()) return inline;
	const file = process.env.BLOG_PRIVATE_KEY_FILE ?? DEFAULT_PRIVATE_KEY_PATH;
	if (existsSync(file)) return readFile(file, 'utf8');

	const method = await select({
		message: '私钥来源（未在环境变量/默认路径中找到）:',
		choices: [
			{ name: '粘贴 PEM 文本', value: 'paste' },
			{ name: '指定文件路径', value: 'file' },
		],
	});
	if (method === 'file') {
		const p = (await input({ message: '私钥文件路径:' })).trim();
		return readFile(p, 'utf8');
	}
	return input({
		message: '粘贴私钥 PEM（含 -----BEGIN/END PRIVATE KEY-----）:',
		multiline: true,
		validate: (v) => (/BEGIN.*PRIVATE KEY/.test(v) ? true : '看起来不像私钥 PEM'),
	});
}

async function readPublicKey() {
	if (!existsSync(PUBLIC_KEY_PATH)) {
		console.error('✗ 找不到公钥 src/keys/public.pem。请先运行 pnpm keygen 生成密钥对。');
		process.exit(1);
	}
	return importPublicKey(await readFile(PUBLIC_KEY_PATH, 'utf8'));
}

async function keygen() {
	if (existsSync(DEFAULT_PRIVATE_KEY_PATH)) {
		const overwrite = await confirm({
			message:
				'.blog-private.pem 已存在。重新生成会让用旧公钥加密的文章永久无法解密。确定覆盖？',
			default: false,
		});
		if (!overwrite) {
			console.log('已取消。');
			return;
		}
	}
	console.log('生成 RSA-OAEP-4096 密钥对…（约数秒）');
	const { publicKeyPem, privateKeyPem } = await generateKeyPairPems();
	await mkdir(join(ROOT, 'src/keys'), { recursive: true });
	await writeFile(PUBLIC_KEY_PATH, publicKeyPem, 'utf8');
	await writeFile(DEFAULT_PRIVATE_KEY_PATH, privateKeyPem, 'utf8');
	console.log(`✓ 公钥: ${PUBLIC_KEY_PATH}`);
	console.log(`        → 可提交进仓库（无害）。`);
	console.log(`✓ 私钥: ${DEFAULT_PRIVATE_KEY_PATH}`);
	console.log(`        → 已被 .gitignore，请离线妥善备份！分发给需要解密的读者。`);
}

async function lockPost() {
	const posts = await listPosts();
	const candidates = posts.filter((p) => !p.data.encrypted);
	if (!candidates.length) {
		console.log('没有可加密的明文文章。');
		return;
	}
	candidates.sort((a, b) => b.id.localeCompare(a.id, 'en', { numeric: true }));
	const post = await select({
		message: '选择要加密的文章（明文正文将被密文替换）:',
		choices: candidates.map((p) => ({ name: p.data.title ?? p.id, value: p, description: p.file })),
	});

	const parsed = matter(post.raw);
	const body = parsed.content;
	if (!body.trim()) {
		console.error('✗ 正文为空，无需加密。');
		process.exit(1);
	}

	const publicKey = await readPublicKey();
	const dataKey = await generateDataKey();
	const iv = generateIV();
	const encMd = await encryptString(body, dataKey, iv);
	const wrappedKey = await wrapDataKey(dataKey, publicKey);

	parsed.data.encrypted = true;
	parsed.data.encMd = encMd;
	parsed.data.wrappedKey = wrappedKey;
	parsed.data.ivMd = bytesToBase64(iv);
	parsed.content = ''; // plaintext body removed — only ciphertext remains

	await writeFile(join(BLOG_DIR, post.file), matter.stringify(parsed.content, parsed.data));
	console.log(`✓ 已加密 ${post.file}`);
	console.log(`  正文已转为密文写入 frontmatter；明文已从文件移除。`);
	console.log(`  提示：本地保留一份明文备份，或用 pnpm unlock 还原。`);
}

async function unlockPost() {
	const posts = await listPosts();
	const candidates = posts.filter((p) => p.data.encrypted);
	if (!candidates.length) {
		console.log('没有已加密的文章。');
		return;
	}
	candidates.sort((a, b) => b.id.localeCompare(a.id, 'en', { numeric: true }));
	const post = await select({
		message: '选择要解密的文章:',
		choices: candidates.map((p) => ({ name: p.data.title ?? p.id, value: p, description: p.file })),
	});

	const parsed = matter(post.raw);
	const { encMd, wrappedKey, ivMd } = parsed.data;
	if (!encMd || !wrappedKey || !ivMd) {
		console.error('✗ 加密字段不完整（缺少 encMd/wrappedKey/ivMd）。');
		process.exit(1);
	}

	const privateKey = await importPrivateKey((await readPrivateKeyPemForCli()).trim());
	let dataKey;
	try {
		dataKey = await unwrapDataKey(wrappedKey, privateKey);
	} catch {
		console.error('✗ 私钥不匹配：无法解包数据密钥。请确认使用的是配套私钥。');
		process.exit(1);
	}
	const body = await decryptString(encMd, dataKey, ivMd);
	if (body == null) {
		console.error('✗ 解密失败：密文可能已损坏。');
		process.exit(1);
	}

	delete parsed.data.encrypted;
	delete parsed.data.encMd;
	delete parsed.data.wrappedKey;
	delete parsed.data.ivMd;
	parsed.content = body;

	await writeFile(join(BLOG_DIR, post.file), matter.stringify(parsed.content, parsed.data));
	console.log(`✓ 已解密 ${post.file}（明文正文已还原）。`);
}

const cmd = process.argv[2];
if (cmd === 'new') {
	newPost().catch((e) => {
		console.error(e?.message || e);
		process.exit(1);
	});
} else if (cmd === 'pin') {
	setPin().catch((e) => {
		console.error(e?.message || e);
		process.exit(1);
	});
} else if (cmd === 'stats') {
	stats().catch((e) => {
		console.error(e?.message || e);
		process.exit(1);
	});
} else if (cmd === 'keygen') {
	keygen().catch((e) => {
		console.error(e?.message || e);
		process.exit(1);
	});
} else if (cmd === 'lock') {
	lockPost().catch((e) => {
		console.error(e?.message || e);
		process.exit(1);
	});
} else if (cmd === 'unlock') {
	unlockPost().catch((e) => {
		console.error(e?.message || e);
		process.exit(1);
	});
} else {
	console.log(
		'用法:\n' +
			'  pnpm new      新建文章\n' +
			'  pnpm pin      置顶 / 取消置顶\n' +
			'  pnpm stats    统计概览\n' +
			'  pnpm keygen   生成加密密钥对\n' +
			'  pnpm lock     加密一篇文章（明文→密文）\n' +
			'  pnpm unlock   解密一篇文章（密文→明文）',
	);
}
