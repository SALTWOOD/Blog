/**
 * Minimal WebDAV client used by the writing room.
 *
 * Only three operations are needed: PROPFIND/OPTIONS (connection test), MKCOL
 * (directory creation) and PUT (file upload with progress). Credentials live in
 * localStorage and are sent only to the configured server via Basic Auth.
 */

export interface WebDavSettings {
	/** Server endpoint, e.g. https://dav.example.com/dav */
	url: string;
	username: string;
	password: string;
	/** Remote folder for uploads, e.g. assets */
	baseDir: string;
	/** Optional public/CDN prefix used in Markdown links. */
	publicUrlPrefix: string;
	/** Template for the remote path. */
	pathFormat: string;
	/** Template for the public link; `{path}` is the encoded remote path. */
	publicUrlFormat: string;
	/** When true, the public link is the public prefix + remote path. */
	syncFormats: boolean;
}

export interface RemoteTarget {
	/** Human-readable, unencoded path inside the server, e.g. assets/2026/10/a-1b2c3d.png */
	remotePath: string;
	/** Absolute URL used for PUT. */
	remoteUrl: string;
	/** URL inserted into Markdown (may point at a CDN). */
	publicUrl: string;
}

export type WebDavErrorKind = 'auth' | 'forbidden' | 'not-found' | 'quota' | 'conflict' | 'network' | 'server';

export class WebDavError extends Error {
	readonly status: number;
	readonly kind: WebDavErrorKind;

	constructor(kind: WebDavErrorKind, message: string, status = 0) {
		super(message);
		this.name = 'WebDavError';
		this.kind = kind;
		this.status = status;
	}
}

export const DEFAULT_WEBDAV_SETTINGS: WebDavSettings = {
	url: '',
	username: '',
	password: '',
	baseDir: 'assets',
	publicUrlPrefix: '',
	pathFormat: '{baseDir}/{yyyy}/{mm}/{slug}/{name}-{id}.{ext}',
	publicUrlFormat: '{path}',
	syncFormats: true,
};

const WEBDAV_KEY = 'saltwood.writing-room.v1.webdav';
const MIME_EXTENSIONS: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
	'image/avif': 'avif',
	'image/bmp': 'bmp',
	'image/x-icon': 'ico',
	'application/pdf': 'pdf',
	'application/zip': 'zip',
	'text/plain': 'txt',
};

function asString(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

export function loadWebDavSettings(): WebDavSettings {
	if (typeof window === 'undefined') return { ...DEFAULT_WEBDAV_SETTINGS };
	try {
		const raw = window.localStorage.getItem(WEBDAV_KEY);
		if (!raw) return { ...DEFAULT_WEBDAV_SETTINGS };
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_WEBDAV_SETTINGS };
		const record = parsed as Record<string, unknown>;
		return {
			url: asString(record.url),
			username: asString(record.username),
			password: asString(record.password),
			baseDir: asString(record.baseDir) || DEFAULT_WEBDAV_SETTINGS.baseDir,
			publicUrlPrefix: asString(record.publicUrlPrefix),
			pathFormat: asString(record.pathFormat) || DEFAULT_WEBDAV_SETTINGS.pathFormat,
			publicUrlFormat:
				typeof record.publicUrlFormat === 'string'
					? record.publicUrlFormat
					: DEFAULT_WEBDAV_SETTINGS.publicUrlFormat,
			syncFormats:
				typeof record.syncFormats === 'boolean'
					? record.syncFormats
					: DEFAULT_WEBDAV_SETTINGS.syncFormats,
		};
	} catch {
		return { ...DEFAULT_WEBDAV_SETTINGS };
	}
}

export function saveWebDavSettings(settings: WebDavSettings): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(WEBDAV_KEY, JSON.stringify(settings));
	} catch {
		throw new Error('无法保存 WebDAV 设置：本地存储不可用或空间不足。');
	}
}

export function isWebDavConfigured(settings: WebDavSettings): boolean {
	return settings.url.trim().length > 0;
}

/** Base64 encoder that handles non-ASCII usernames/passwords. */
export function basicAuthHeader(username: string, password: string): string {
	const bytes = new TextEncoder().encode(`${username}:${password}`);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	const encoded = typeof btoa === 'function' ? btoa(binary) : '';
	return `Basic ${encoded}`;
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

function encodeSegments(segments: string[]): string {
	return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

/** Encode a possibly nested base directory without escaping its slashes. */
function encodeBaseDir(value: string): string {
	return value
		.split('/')
		.map((segment) => segment.replace(/[\u0000-\u001f\u007f\\]/g, '').trim())
		.filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
		.map((segment) => encodeURIComponent(segment))
		.join('/');
}

function extensionFor(file: File): string {
	const match = /\.([A-Za-z0-9]{1,10})$/.exec(file.name);
	if (match) return match[1].toLowerCase();
	const fromMime = MIME_EXTENSIONS[file.type.toLowerCase()];
	return fromMime ?? 'bin';
}

function stemFor(file: File): string {
	const name = file.name.replace(/\\/g, '/').split('/').pop() ?? file.name ?? 'file';
	const withoutExtension = name.replace(/\.[A-Za-z0-9]{1,10}$/, '');
	return withoutExtension || name || 'file';
}

/** ASCII-safe file stem; CJK-only names fall back to "file" (+ a unique id). */
export function sanitizeFileStem(value: string): string {
	const sanitized = value
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^\x20-\x7E]+/g, '-')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return sanitized || 'file';
}

/** Path-segment sanitizer for the draft slug; keeps CJK and spaces. */
export function sanitizeSlugSegment(value: string): string {
	return value
		.trim()
		.replace(/[\u0000-\u001f\u007f\\/]/g, '')
		.replace(/[<>:"|?*]/g, '')
		.trim();
}

export function shortId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		const bytes = new Uint8Array(4);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0'))
			.join('')
			.slice(0, 6);
	}
	return Math.random().toString(36).slice(2, 8);
}

const PATH_PLACEHOLDERS = [
	'baseDir',
	'slug',
	'name',
	'ext',
	'yyyy',
	'mm',
	'dd',
	'id',
	'index',
] as const;

const PUBLIC_PLACEHOLDERS = [...PATH_PLACEHOLDERS, 'path'] as const;

function templateError(format: string, allowed: readonly string[]): string | null {
	for (const match of format.matchAll(/\{([^{}]*)\}/g)) {
		if (!allowed.includes(match[1])) return `未知占位符 {${match[1]}}`;
	}
	if (/[{}]/.test(format.replace(/\{[^{}]*\}/g, ''))) {
		return '格式包含不完整的占位符';
	}
	return null;
}

export function validatePathFormat(format: string): string | null {
	const trimmed = format.trim();
	if (!trimmed) return '远程路径格式不能为空';
	const error = templateError(trimmed, PATH_PLACEHOLDERS);
	if (error) return error;
	if (!trimmed.includes('{ext}')) return '远程路径格式需包含 {ext}';
	return null;
}

export function validatePublicUrlFormat(
	format: string,
	syncFormats: boolean,
): string | null {
	if (syncFormats) return null;
	const trimmed = format.trim();
	if (!trimmed) return null;
	return templateError(trimmed, PUBLIC_PLACEHOLDERS);
}

/** Validate both upload templates; returns a Chinese error or null. */
export function validateFormats(settings: WebDavSettings): string | null {
	return (
		validatePathFormat(settings.pathFormat ?? '') ??
		validatePublicUrlFormat(settings.publicUrlFormat ?? '', settings.syncFormats !== false)
	);
}

function renderTemplate(
	format: string,
	values: Record<string, string>,
	allowed: readonly string[],
	encodedPath = '',
): string {
	return format.replace(/\{([^{}]*)\}/g, (_match, key: string) => {
		if (key === 'path') {
			if (!allowed.includes('path')) throw new WebDavError('server', '未知占位符 {path}');
			return encodedPath;
		}
		if (!allowed.includes(key)) {
			throw new WebDavError('server', `未知占位符 {${key}}`);
		}
		return values[key] ?? '';
	});
}

function normalizePathSegments(rendered: string): string[] {
	const segments = rendered
		.split('/')
		.map((segment) => segment.replace(/[\u0000-\u001f\u007f\\]/g, '').trim())
		.filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
	if (segments.length === 0) {
		throw new WebDavError('server', '远程路径格式渲染结果为空。');
	}
	return segments;
}

interface TargetOptions {
	now?: Date;
	shortId?: string;
	usedNames?: Set<string>;
	slug: string;
	/** 1-based index within the current upload batch. */
	index: number;
}

/** Build the remote path and public link from the configured templates. */
export function buildRemoteTarget(
	file: File,
	settings: WebDavSettings,
	options: TargetOptions,
): RemoteTarget {
	const pathFormat =
		typeof settings.pathFormat === 'string'
			? settings.pathFormat
			: DEFAULT_WEBDAV_SETTINGS.pathFormat;
	const pathError = validatePathFormat(pathFormat);
	if (pathError) throw new WebDavError('server', pathError);

	const syncFormats = settings.syncFormats !== false;
	const publicUrlFormat =
		typeof settings.publicUrlFormat === 'string'
			? settings.publicUrlFormat
			: DEFAULT_WEBDAV_SETTINGS.publicUrlFormat;
	if (!syncFormats) {
		const publicError = validatePublicUrlFormat(publicUrlFormat, false);
		if (publicError) throw new WebDavError('server', publicError);
	}

	const server = trimTrailingSlash(settings.url.trim());
	if (!server) throw new WebDavError('not-found', '请先填写 WebDAV 服务器 URL。');

	const now = options.now ?? new Date();
	const values: Record<string, string> = {
		baseDir: settings.baseDir,
		slug: sanitizeSlugSegment(options.slug),
		name: sanitizeFileStem(stemFor(file)),
		ext: extensionFor(file),
		yyyy: String(now.getFullYear()),
		mm: String(now.getMonth() + 1).padStart(2, '0'),
		dd: String(now.getDate()).padStart(2, '0'),
		id: options.shortId ?? shortId(),
		index: String(options.index),
	};

	let segments: string[] = [];
	let remotePath = '';
	for (let attempt = 0; attempt < 5; attempt += 1) {
		segments = normalizePathSegments(renderTemplate(pathFormat, values, PATH_PLACEHOLDERS));
		remotePath = segments.join('/');
		if (!options.usedNames || !options.usedNames.has(remotePath)) break;
		values.id = shortId();
	}
	if (options.usedNames) {
		if (options.usedNames.has(remotePath)) {
			throw new WebDavError('server', '远程路径重复，请在格式中加入 {id} 或 {index}。');
		}
		options.usedNames.add(remotePath);
	}

	const encodedPath = encodeSegments(segments);
	const remoteUrl = `${server}/${encodedPath}`;
	const publicBase = trimTrailingSlash(settings.publicUrlPrefix.trim() || server);

	let publicUrl: string;
	if (syncFormats) {
		publicUrl = `${publicBase}/${encodedPath}`;
	} else {
		const encodedValues: Record<string, string> = {};
		for (const [key, value] of Object.entries(values)) {
			// A base directory may be nested; encode segment by segment so the
			// slashes stay slashes instead of becoming %2F.
			encodedValues[key] = key === 'baseDir' ? encodeBaseDir(value) : encodeURIComponent(value);
		}
		const renderedPublic = renderTemplate(
			publicUrlFormat.trim() || '{path}',
			encodedValues,
			PUBLIC_PLACEHOLDERS,
			encodedPath,
		);
		publicUrl = /^https?:\/\//i.test(renderedPublic)
			? renderedPublic
			: `${publicBase}/${renderedPublic.replace(/^\/+/, '')}`;
	}

	return { remotePath, remoteUrl, publicUrl };
}

/** Segments needed for MKCOL, excluding the server itself. */
function directorySegments(target: RemoteTarget): string[] {
	return target.remotePath.split('/').slice(0, -1);
}

function describeFailure(status: number, action: 'test' | 'upload' | 'mkdir'): WebDavError {
	const prefix = action === 'test' ? '连接测试失败' : action === 'mkdir' ? '创建远程目录失败' : '上传失败';
	switch (status) {
		case 401:
			return new WebDavError('auth', `${prefix}（401）：用户名或密码不正确。`, status);
		case 403:
			return new WebDavError('forbidden', `${prefix}（403）：账号没有访问/写入该路径的权限。`, status);
		case 404:
			return new WebDavError(
				'not-found',
				`${prefix}（404）：路径不存在，请检查服务器 URL 与基础目录。`,
				status,
			);
		case 405:
			return new WebDavError('server', `${prefix}（405）：服务器不支持该操作。`, status);
		case 409:
			return new WebDavError('conflict', `${prefix}（409）：远程目录冲突或父目录缺失。`, status);
		case 507:
			return new WebDavError('quota', `${prefix}（507）：服务器存储空间不足。`, status);
		default:
			return new WebDavError('server', `${prefix}（HTTP ${status}）。`, status);
	}
}

function networkFailure(): WebDavError {
	return new WebDavError('network', '网络错误或 CORS 被拦截，请检查地址与服务端配置。');
}

function authHeaders(settings: WebDavSettings): HeadersInit {
	return {
		Authorization: basicAuthHeader(settings.username, settings.password),
	};
}

/** Probe the endpoint and Basic Auth credentials. */
export async function testConnection(settings: WebDavSettings): Promise<void> {
	const server = trimTrailingSlash(settings.url.trim());
	if (!server) throw new WebDavError('not-found', '请先填写 WebDAV 服务器 URL。');

	let response: Response;
	try {
		response = await fetch(server, {
			method: 'PROPFIND',
			headers: {
				...authHeaders(settings),
				Depth: '0',
				'Content-Type': 'application/xml; charset=utf-8',
			},
			body: '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>',
		});
	} catch {
		throw networkFailure();
	}

	if (response.ok) return;
	if (response.status === 405) {
		// Some minimal servers do not implement PROPFIND; OPTIONS still proves
		// that the endpoint is reachable (though not that writing works).
		try {
			const options = await fetch(server, {
				method: 'OPTIONS',
				headers: authHeaders(settings),
			});
			if (options.ok || options.status === 204) return;
			throw describeFailure(options.status, 'test');
		} catch (error) {
			if (error instanceof WebDavError) throw error;
			throw networkFailure();
		}
	}
	throw describeFailure(response.status, 'test');
}

async function ensureDirectory(
	settings: WebDavSettings,
	segments: string[],
	signal: AbortSignal,
): Promise<void> {
	const server = trimTrailingSlash(settings.url.trim());
	for (let index = 1; index <= segments.length; index += 1) {
		const url = `${server}/${encodeSegments(segments.slice(0, index))}`;
		let response: Response;
		try {
			response = await fetch(url, {
				method: 'MKCOL',
				headers: authHeaders(settings),
				signal,
			});
		} catch (error) {
			if (signal.aborted) throw error;
			throw networkFailure();
		}
		// 405 = collection already exists; some servers return 301/302 after
		// normalising the path (fetch follows them automatically).
		if (response.ok || response.status === 405) continue;
		if (response.status === 409) continue;
		throw describeFailure(response.status, 'mkdir');
	}
}

function putFile(
	settings: WebDavSettings,
	target: RemoteTarget,
	file: File,
	onProgress: (percent: number) => void,
	signal: AbortSignal,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', target.remoteUrl, true);
		xhr.setRequestHeader('Authorization', basicAuthHeader(settings.username, settings.password));
		xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
		xhr.upload.onprogress = (event: ProgressEvent) => {
			if (!event.lengthComputable || event.total <= 0) return;
			onProgress(Math.round((event.loaded / event.total) * 100));
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				onProgress(100);
				resolve();
				return;
			}
			reject(describeFailure(xhr.status, 'upload'));
		};
		xhr.onerror = () => reject(networkFailure());
		xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));
		const abort = () => xhr.abort();
		if (signal.aborted) {
			reject(new DOMException('Upload aborted', 'AbortError'));
			return;
		}
		signal.addEventListener('abort', abort, { once: true });
		xhr.onloadend = () => signal.removeEventListener('abort', abort);
		xhr.send(file);
	});
}

/** Create the remote folders and PUT the file, reporting 0–100 progress. */
export async function uploadFile(
	settings: WebDavSettings,
	file: File,
	target: RemoteTarget,
	onProgress: (percent: number) => void,
	signal: AbortSignal,
): Promise<void> {
	await ensureDirectory(settings, directorySegments(target), signal);
	await putFile(settings, target, file, onProgress, signal);
}
