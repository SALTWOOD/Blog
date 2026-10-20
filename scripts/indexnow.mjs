import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const KEY = 'd76310ea7d8315c12afea994a6b8fc10';
const SITE = (process.env.INDEXNOW_SITE ?? 'https://ski.ink').replace(/\/$/, '');
const HOST = new URL(SITE).hostname;
const ENDPOINT = process.env.INDEXNOW_ENDPOINT ?? 'https://api.indexnow.org/indexnow';
const KEY_URL = `${SITE}/${KEY}.txt`;
const EXCLUDED = new Set(['/about', '/about/']);
const BATCH = 10000;
const RETRY_MS = 15000;

const options = { all: false, dryRun: false, wait: 0, urls: [], filesFrom: null };

for (const arg of process.argv.slice(2)) {
	if (arg === '--all') options.all = true;
	else if (arg === '--dry-run') options.dryRun = true;
	else if (arg.startsWith('--url=')) options.urls.push(arg.slice(6));
	else if (arg.startsWith('--files-from=')) options.filesFrom = arg.slice(13);
	else if (arg.startsWith('--wait=')) options.wait = Number(arg.slice(7)) || 0;
	else options.urls.push(arg);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function postUrl(file) {
	const relative = file.trim().replaceAll('\\', '/');
	const match = /^src\/content\/blog\/(.+)\.mdx?$/.exec(relative);
	if (!match || !existsSync(relative)) return null;
	return `${SITE}/blog/${match[1]}/`;
}

function sitemapUrls() {
	if (!existsSync('dist')) return [];
	const urls = [];
	for (const file of readdirSync('dist').filter((name) => /^sitemap-\d+\.xml$/.test(name))) {
		const xml = readFileSync(join('dist', file), 'utf8');
		for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(match[1]);
	}
	return urls;
}

function collectUrls() {
	const candidates = [];

	if (options.all) candidates.push(...sitemapUrls());

	if (options.filesFrom) {
		const lines = readFileSync(options.filesFrom, 'utf8').split(/\r?\n/).filter(Boolean);
		const posts = lines.map(postUrl).filter(Boolean);
		if (posts.length > 0) candidates.push(...posts, `${SITE}/`, `${SITE}/blog/`);
	}

	candidates.push(...options.urls);

	return [...new Set(candidates)]
		.map((value) => new URL(value, SITE))
		.filter((url) => url.hostname === HOST && !EXCLUDED.has(url.pathname))
		.map((url) => url.href);
}

async function keyIsLive() {
	try {
		const response = await fetch(KEY_URL, { cache: 'no-store' });
		return response.ok && (await response.text()).trim() === KEY;
	} catch {
		return false;
	}
}

async function reachable(url) {
	try {
		const response = await fetch(url, { method: 'HEAD', redirect: 'manual', cache: 'no-store' });
		return response.status === 200;
	} catch {
		return false;
	}
}

async function waitFor(check, label, seconds) {
	const deadline = Date.now() + seconds * 1000;
	for (;;) {
		if (await check()) return true;
		if (Date.now() >= deadline) {
			console.error(`indexnow: gave up waiting for ${label}`);
			return false;
		}
		await sleep(Math.min(RETRY_MS, Math.max(1000, deadline - Date.now())));
	}
}

async function waitForUrls(urls, seconds) {
	const pending = [];
	for (const url of urls) if (!(await reachable(url))) pending.push(url);
	if (pending.length === 0) return [];

	console.log(`indexnow: waiting up to ${seconds}s for ${pending.length} url(s)`);
	const deadline = Date.now() + seconds * 1000;
	while (pending.length > 0 && Date.now() < deadline) {
		await sleep(RETRY_MS);
		for (let index = pending.length - 1; index >= 0; index--) {
			if (await reachable(pending[index])) pending.splice(index, 1);
		}
	}
	return pending;
}

async function submitBatch(batch) {
	const response = await fetch(ENDPOINT, {
		method: 'POST',
		headers: { 'content-type': 'application/json; charset=utf-8' },
		body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_URL, urlList: batch }),
	});
	const body = (await response.text()).trim();
	console.log(`indexnow: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`);
	return response.status === 200 || response.status === 202;
}

async function main() {
	const urls = collectUrls();

	if (urls.length === 0) {
		console.log('indexnow: nothing to submit');
		return 0;
	}

	console.log(`indexnow: ${urls.length} url(s)`);
	for (const url of urls.slice(0, 30)) console.log(`  ${url}`);
	if (urls.length > 30) console.log(`  ... +${urls.length - 30} more`);

	if (options.dryRun) return 0;

	const keyPath = `public/${KEY}.txt`;

	if (!existsSync(keyPath) || readFileSync(keyPath, 'utf8').trim() !== KEY) {
		console.error(`indexnow: ${keyPath} is missing or does not contain the key`);
		return 1;
	}

	if (!(await waitFor(keyIsLive, KEY_URL, options.wait))) return 1;

	if (options.wait > 0) {
		const pending = await waitForUrls(urls, options.wait);
		if (pending.length > 0) console.log(`indexnow: still pending ${pending.join(', ')}`);
	}

	let ok = true;
	for (let offset = 0; offset < urls.length; offset += BATCH) {
		if (!(await submitBatch(urls.slice(offset, offset + BATCH)))) ok = false;
	}
	return ok ? 0 : 1;
}

main().then(
	(code) => {
		process.exitCode = code;
	},
	(error) => {
		console.error(`indexnow: ${error.message}`);
		process.exitCode = 1;
	},
);
