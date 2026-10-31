import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatBytes } from './lib/document';
import {
	testConnection,
	validateFormats,
	WebDavError,
	type WebDavSettings,
} from './lib/webdav';
import type { UploadItem, UploadMode } from './useWritingRoom';

const FOCUSABLE =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(panel: HTMLElement): HTMLElement[] {
	return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
		(element) => element.offsetParent !== null || element === document.activeElement,
	);
}

interface DialogProps {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
	wide?: boolean;
}

/**
 * Accessible modal: labelled, Escape closes, focus is moved in/restored, and
 * Tab is wrapped inside the panel (no keyboard trap without an exit).
 */
export function Dialog({ open, title, onClose, children, footer, wide = false }: DialogProps) {
	const titleId = useId();
	const panelRef = useRef<HTMLDivElement>(null);
	const previousFocus = useRef<HTMLElement | null>(null);
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	useEffect(() => {
		if (!open) return;
		previousFocus.current =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		const focusTimer = window.setTimeout(() => {
			const panel = panelRef.current;
			if (!panel) return;
			const preferred = panel.querySelector<HTMLElement>('[data-autofocus]');
			const focusable = focusableElements(panel);
			(preferred ?? focusable[0] ?? panel).focus();
		}, 0);

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onCloseRef.current();
				return;
			}
			if (event.key !== 'Tab') return;
			const panel = panelRef.current;
			if (!panel) return;
			const focusable = focusableElements(panel);
			if (focusable.length === 0) {
				event.preventDefault();
				panel.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement;
			if (!(active instanceof HTMLElement) || !panel.contains(active)) {
				event.preventDefault();
				first.focus();
				return;
			}
			if (event.shiftKey && active === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			window.clearTimeout(focusTimer);
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = originalOverflow;
			previousFocus.current?.focus();
		};
	}, [open]);

	if (!open || typeof document === 'undefined') return null;

	return createPortal(
		<div
			className="wr-modal-backdrop"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				ref={panelRef}
				className={wide ? 'wr-modal wr-modal-wide' : 'wr-modal'}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
			>
				<header className="wr-modal-head">
					<h2 id={titleId}>{title}</h2>
					<button type="button" className="wr-icon-btn" onClick={onClose} aria-label="关闭">
						×
					</button>
				</header>
				<div className="wr-modal-body">{children}</div>
				{footer ? <footer className="wr-modal-foot">{footer}</footer> : null}
			</div>
		</div>,
		document.body,
	);
}

/* ---------------------------------------------------------------- simple dialogs */

interface TextPromptDialogProps {
	open: boolean;
	title: string;
	label: string;
	initialValue: string;
	confirmLabel?: string;
	onConfirm: (value: string) => void;
	onClose: () => void;
}

export function TextPromptDialog({
	open,
	title,
	label,
	initialValue,
	confirmLabel = '确定',
	onConfirm,
	onClose,
}: TextPromptDialogProps) {
	const [value, setValue] = useState(initialValue);

	useEffect(() => {
		if (open) setValue(initialValue);
	}, [open, initialValue]);

	return (
		<Dialog
			open={open}
			title={title}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="wr-btn" onClick={onClose}>
						取消
					</button>
					<button
						type="button"
						className="wr-btn wr-btn-primary"
						disabled={!value.trim()}
						onClick={() => onConfirm(value.trim())}
					>
						{confirmLabel}
					</button>
				</>
			}
		>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (value.trim()) onConfirm(value.trim());
				}}
			>
				<label className="wr-field">
					<span>{label}</span>
					<input
						type="text"
						data-autofocus
						value={value}
						onChange={(event) => setValue(event.target.value)}
					/>
				</label>
			</form>
		</Dialog>
	);
}

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	danger?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = '确定',
	danger = false,
	onConfirm,
	onClose,
}: ConfirmDialogProps) {
	return (
		<Dialog
			open={open}
			title={title}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="wr-btn" onClick={onClose}>
						取消
					</button>
					<button
						type="button"
						className={danger ? 'wr-btn wr-btn-danger' : 'wr-btn wr-btn-primary'}
						onClick={onConfirm}
					>
						{confirmLabel}
					</button>
				</>
			}
		>
			<p className="wr-dialog-message">{message}</p>
		</Dialog>
	);
}

interface MarkdownDropDialogProps {
	open: boolean;
	fileName: string;
	fileSize: number;
	ignoredCount: number;
	onImport: () => void;
	onClose: () => void;
}

export function MarkdownDropDialog({
	open,
	fileName,
	fileSize,
	ignoredCount,
	onImport,
	onClose,
}: MarkdownDropDialogProps) {
	return (
		<Dialog
			open={open}
			title="检测到 Markdown 文件"
			onClose={onClose}
			footer={
				<>
					<button type="button" className="wr-btn" onClick={onClose}>
						取消
					</button>
					<button type="button" className="wr-btn wr-btn-primary" onClick={onImport}>
						导入到编辑器
					</button>
				</>
			}
		>
			<p className="wr-dialog-message">
				{fileName}（{formatBytes(fileSize)}）将作为新草稿导入，不会上传。
			</p>
			{ignoredCount > 0 ? (
				<p className="wr-inline-error" role="alert">
					另有 {ignoredCount} 个文件未处理。
				</p>
			) : null}
		</Dialog>
	);
}

/* --------------------------------------------------------------- WebDAV dialog */

interface WebDavSettingsDialogProps {
	open: boolean;
	settings: WebDavSettings;
	onClose: () => void;
	onSave: (settings: WebDavSettings) => void;
}

type TestResult = { ok: true; message: string } | { ok: false; message: string } | null;

export function WebDavSettingsDialog({
	open,
	settings,
	onClose,
	onSave,
}: WebDavSettingsDialogProps) {
	const [draft, setDraft] = useState<WebDavSettings>(settings);
	const [showPassword, setShowPassword] = useState(false);
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<TestResult>(null);
	const [formatError, setFormatError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setDraft(settings);
		setShowPassword(false);
		setTestResult(null);
		setFormatError(null);
	}, [open, settings]);

	function update<K extends keyof WebDavSettings>(key: K, value: WebDavSettings[K]) {
		setDraft((current) => ({ ...current, [key]: value }));
		setTestResult(null);
		setFormatError(null);
	}

	async function handleTest() {
		setTesting(true);
		setTestResult(null);
		try {
			await testConnection(draft);
			setTestResult({ ok: true, message: '连接成功。' });
		} catch (error) {
			const message =
				error instanceof WebDavError
					? error.message
					: error instanceof Error
						? error.message
						: '连接失败：未知错误。';
			setTestResult({ ok: false, message });
		} finally {
			setTesting(false);
		}
	}

	function handleSave() {
		const next: WebDavSettings = {
			url: draft.url.trim(),
			username: draft.username,
			password: draft.password,
			baseDir: draft.baseDir.trim() || 'assets',
			publicUrlPrefix: draft.publicUrlPrefix.trim(),
			pathFormat: draft.pathFormat.trim(),
			publicUrlFormat: draft.publicUrlFormat.trim(),
			syncFormats: draft.syncFormats,
		};
		const error = validateFormats(next);
		if (error) {
			setFormatError(error);
			return;
		}
		setFormatError(null);
		onSave(next);
	}

	return (
		<Dialog
			open={open}
			title="WebDAV 上传设置"
			onClose={onClose}
			wide
			footer={
				<>
					<button type="button" className="wr-btn" onClick={onClose}>
						取消
					</button>
					<button type="button" className="wr-btn wr-btn-primary" onClick={handleSave}>
						保存设置
					</button>
				</>
			}
		>
			<p className="wr-hint">配置只保存在本机；密码仅用于连接此 WebDAV。</p>

			<label className="wr-field">
				<span>服务器 URL</span>
				<input
					type="url"
					data-autofocus
					value={draft.url}
					onChange={(event) => update('url', event.target.value)}
					placeholder="https://dav.example.com/dav"
					autoComplete="url"
				/>
			</label>

			<div className="wr-field-row">
				<label className="wr-field">
					<span>用户名</span>
					<input
						type="text"
						value={draft.username}
						onChange={(event) => update('username', event.target.value)}
						autoComplete="username"
					/>
				</label>
				<label className="wr-field">
					<span>密码</span>
					<span className="wr-password-wrap">
						<input
							type={showPassword ? 'text' : 'password'}
							value={draft.password}
							onChange={(event) => update('password', event.target.value)}
							autoComplete="current-password"
						/>
						<button
							type="button"
							className="wr-btn wr-btn-tiny"
							onClick={() => setShowPassword((value) => !value)}
							aria-label={showPassword ? '隐藏密码' : '显示密码'}
						>
							{showPassword ? '隐藏' : '显示'}
						</button>
					</span>
				</label>
			</div>

			<label className="wr-field">
				<span>基础目录</span>
				<input
					type="text"
					value={draft.baseDir}
					onChange={(event) => update('baseDir', event.target.value)}
					placeholder="assets"
				/>
				<small>用于 {'{baseDir}'} 占位符</small>
			</label>

			<label className="wr-checkbox">
				<input
					type="checkbox"
					checked={draft.syncFormats}
					onChange={(event) => update('syncFormats', event.target.checked)}
				/>
				<span>公开链接与远程路径使用同一格式</span>
			</label>

			<label className="wr-field">
				<span>远程路径格式</span>
				<input
					type="text"
					value={draft.pathFormat}
					onChange={(event) => update('pathFormat', event.target.value)}
				/>
				<small>
					{'可用：{baseDir} {slug} {name} {ext} {yyyy} {mm} {dd} {id} {index}'}
				</small>
			</label>

			<label className="wr-field">
				<span>公开 URL 前缀</span>
				<input
					type="text"
					value={draft.publicUrlPrefix}
					onChange={(event) => update('publicUrlPrefix', event.target.value)}
					placeholder="https://cdn.example.com/uploads"
				/>
				<small>同步模式或相对公开链接会拼接此地址。</small>
			</label>

			{draft.syncFormats ? (
				<p className="wr-hint">公开链接 = 公开前缀 + 远程路径</p>
			) : (
				<label className="wr-field">
					<span>公开链接格式</span>
					<input
						type="text"
						value={draft.publicUrlFormat}
						onChange={(event) => update('publicUrlFormat', event.target.value)}
						placeholder="https://cdn.example.com/{path}"
					/>
					<small>{'{path} 为远程路径；相对链接会拼接到公开前缀'}</small>
				</label>
			)}

			{formatError ? (
				<p className="wr-inline-error" role="alert">
					{formatError}
				</p>
			) : null}

			<div className="wr-test-row">
				<button
					type="button"
					className="wr-btn"
					onClick={handleTest}
					disabled={testing || !draft.url.trim()}
				>
					{testing ? '测试中…' : '测试连接'}
				</button>
				{testResult ? (
					<p
						className={testResult.ok ? 'wr-test-result ok' : 'wr-test-result error'}
						role="status"
					>
						{testResult.message}
					</p>
				) : null}
			</div>
		</Dialog>
	);
}

/* ---------------------------------------------------------------- upload dialog */

interface UploadDialogProps {
	open: boolean;
	items: UploadItem[];
	mode: UploadMode;
	uploading: boolean;
	slug: string;
	onStart: () => void;
	onCancelUpload: () => void;
	onClose: () => void;
	onRetry: (id: string) => void;
	onFinish: () => void;
}

const STATUS_TEXT: Record<UploadItem['status'], string> = {
	pending: '等待上传',
	uploading: '上传中',
	done: '已完成',
	error: '失败',
	canceled: '已取消',
};

export function UploadDialog({
	open,
	items,
	mode,
	uploading,
	slug,
	onStart,
	onCancelUpload,
	onClose,
	onRetry,
	onFinish,
}: UploadDialogProps) {
	const started = items.some((item) => item.status !== 'pending');
	const doneCount = items.filter((item) => item.status === 'done').length;
	const failedCount = items.filter((item) => item.status === 'error').length;

	const footer = uploading ? (
		<button type="button" className="wr-btn wr-btn-danger" onClick={onCancelUpload}>
			取消上传
		</button>
	) : started ? (
		<>
			<button type="button" className="wr-btn" onClick={onClose}>
				关闭
			</button>
			<button
				type="button"
				className="wr-btn wr-btn-primary"
				onClick={onFinish}
				disabled={doneCount === 0}
			>
				{mode === 'insert' ? `插入到编辑器（${doneCount}）` : `完成（${doneCount}）`}
			</button>
		</>
	) : (
		<>
			<button type="button" className="wr-btn" onClick={onClose}>
				取消
			</button>
			<button type="button" className="wr-btn wr-btn-primary" onClick={onStart}>
				开始上传
			</button>
		</>
	);

	return (
		<Dialog open={open} title="上传到 WebDAV" onClose={uploading ? onCancelUpload : onClose} wide footer={footer}>
			<p className="wr-hint">确认后逐个上传。</p>
			<p className="wr-upload-slug">
				slug：<code>{slug}</code>
			</p>
			{failedCount > 0 && !uploading ? (
				<p className="wr-inline-error" role="alert">
					{failedCount} 个文件失败，可重试。
				</p>
			) : null}
			<ul className="wr-upload-list">
				{items.map((item) => (
					<li key={item.id} className={`wr-upload-item is-${item.status}`}>
						<div className="wr-upload-head">
							<strong title={item.file.name}>{item.file.name}</strong>
							<span className={`wr-upload-status is-${item.status}`}>
								{STATUS_TEXT[item.status]}
								{item.status === 'uploading' ? ` ${item.progress}%` : ''}
							</span>
						</div>
						<div className="wr-upload-meta">
							<span>
								{formatBytes(item.file.size)} · {item.file.type || '未知类型'}
							</span>
						</div>
						<dl className="wr-upload-paths">
							<div>
								<dt>远程路径</dt>
								<dd>{item.target.remotePath}</dd>
							</div>
							<div>
								<dt>公开链接</dt>
								<dd>{item.target.publicUrl}</dd>
							</div>
						</dl>
						{item.status === 'uploading' || item.status === 'done' ? (
							<div
								className="wr-progress"
								role="progressbar"
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={item.progress}
							>
								<span style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} />
							</div>
						) : null}
						{item.error ? <p className="wr-inline-error">{item.error}</p> : null}
						{item.status === 'error' && !uploading ? (
							<button
								type="button"
								className="wr-btn wr-btn-small"
								onClick={() => onRetry(item.id)}
							>
								重试
							</button>
						) : null}
					</li>
				))}
			</ul>
		</Dialog>
	);
}
