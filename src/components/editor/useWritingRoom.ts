import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExposeParam, UploadImgCallBack } from 'md-editor-rt';
import type { ChangeEvent, DragEvent } from 'react';
import { useMediaQuery } from './hooks';
import type { Draft } from './lib/document';
import {
	copyText,
	countWords,
	createDraft,
	deriveDraftTitle,
	deriveMarkdownFilename,
	derivePreviewPostId,
	downloadText,
	DraftStorageError,
	escapeMarkdownLabel,
	getFrontmatterTitle,
	isImageFile,
	isMarkdownFile,
	loadActiveDraftId,
	loadDrafts,
	readRawDrafts,
	readTextFile,
	saveActiveDraftId,
	saveDrafts,
	validateSlug,
} from './lib/document';
import { setPreviewPostId } from './lib/markdown-preview';
import {
	buildRemoteTarget,
	isWebDavConfigured,
	loadWebDavSettings,
	saveWebDavSettings,
	uploadFile,
	WebDavError,
	type RemoteTarget,
	type WebDavSettings,
} from './lib/webdav';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export type MobileView = 'edit' | 'preview';

export type UploadMode = 'insert' | 'callback';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error' | 'canceled';

export interface UploadItem {
	id: string;
	file: File;
	target: RemoteTarget;
	status: UploadStatus;
	progress: number;
	error?: string;
}

export interface Notice {
	tone: 'info' | 'success' | 'error';
	message: string;
}

export type { Draft };

interface UploadState {
	open: boolean;
	mode: UploadMode;
	items: UploadItem[];
	uploading: boolean;
	slug: string;
}

interface StorageIssue {
	message: string;
	raw: string | null;
}

interface ImportDrop {
	fileName: string;
	fileSize: number;
	ignoredCount: number;
	file: File;
}

function uploadMarkdown(item: UploadItem): string {
	const base = item.file.name.replace(/\.[^.]+$/, '') || item.file.name || 'file';
	const image = isImageFile(item.file);
	const label = escapeMarkdownLabel(image ? base : item.file.name);
	return `${image ? '!' : ''}[${label}](${item.target.publicUrl})`;
}

/** All writing-room state and side effects, kept out of the render component. */
export function useWritingRoom() {
	const [drafts, setDrafts] = useState<Draft[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [content, setContent] = useState('');
	const [status, setStatus] = useState<SaveStatus>('saved');
	const [loaded, setLoaded] = useState(false);
	const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
	const [storageIssue, setStorageIssue] = useState<StorageIssue | null>(null);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [settings, setSettings] = useState<WebDavSettings>(() => loadWebDavSettings());
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [renameOpen, setRenameOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [overwriteOpen, setOverwriteOpen] = useState(false);
	const [importDrop, setImportDrop] = useState<ImportDrop | null>(null);
	const [upload, setUpload] = useState<UploadState | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const [mobileView, setMobileView] = useState<MobileView>('edit');
	const [editorReady, setEditorReady] = useState(false);

	const draftsRef = useRef<Draft[]>([]);
	const activeIdRef = useRef<string | null>(null);
	const contentRef = useRef('');
	const lastSavedRef = useRef('');
	const autoSaveEnabledRef = useRef(true);
	const settingsRef = useRef(settings);
	const noticeTimerRef = useRef<number | null>(null);
	const editorRef = useRef<ExposeParam | null>(null);
	const uploadRef = useRef<UploadState | null>(null);
	const uploadAbortRef = useRef<AbortController | null>(null);
	const uploadCallbackRef = useRef<UploadImgCallBack | null>(null);
	const callbackDeliveredRef = useRef(false);
	const dragDepthRef = useRef(0);
	const importInputRef = useRef<HTMLInputElement>(null);
	const slugInputRef = useRef<HTMLInputElement>(null);
	const slugPersistTimerRef = useRef<number | null>(null);
	const slugDirtyRef = useRef(false);

	const isMobile = useMediaQuery('(max-width: 820px)');

	const showNotice = useCallback((tone: Notice['tone'], message: string) => {
		setNotice({ tone, message });
		if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
		noticeTimerRef.current = window.setTimeout(() => setNotice(null), 5000);
	}, []);

	useEffect(() => {
		return () => {
			if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
			if (slugPersistTimerRef.current !== null) {
				window.clearTimeout(slugPersistTimerRef.current);
			}
		};
	}, []);

	const setDraftList = useCallback((next: Draft[]) => {
		draftsRef.current = next;
		setDrafts(next);
	}, []);

	const focusSlug = useCallback(() => {
		const input = slugInputRef.current;
		if (!input) return;
		input.focus();
		input.select();
	}, []);

	const getActiveSlug = useCallback((): string => {
		const id = activeIdRef.current;
		if (!id) return '';
		return draftsRef.current.find((draft) => draft.id === id)?.slug ?? '';
	}, []);

	const handleSlugChange = useCallback(
		(value: string) => {
			const id = activeIdRef.current;
			if (!id) return;
			const next = draftsRef.current.map((draft) =>
				draft.id === id ? { ...draft, slug: value } : draft,
			);
			setDraftList(next);
			slugDirtyRef.current = true;
			if (slugPersistTimerRef.current !== null) {
				window.clearTimeout(slugPersistTimerRef.current);
			}
			slugPersistTimerRef.current = window.setTimeout(() => {
				slugPersistTimerRef.current = null;
				if (!autoSaveEnabledRef.current) return;
				try {
					saveDrafts(draftsRef.current);
					slugDirtyRef.current = false;
				} catch (error) {
					showNotice(
						'error',
						error instanceof Error ? error.message : 'Slug 未能保存到本地存储。',
					);
				}
			}, 400);
		},
		[setDraftList, showNotice],
	);

	const setUploadState = useCallback((next: UploadState | null) => {
		uploadRef.current = next;
		setUpload(next);
	}, []);

	const patchUpload = useCallback((updater: (state: UploadState) => UploadState) => {
		const current = uploadRef.current;
		if (!current) return;
		const next = updater(current);
		uploadRef.current = next;
		setUpload(next);
	}, []);

	const updateItem = useCallback(
		(id: string, patch: Partial<UploadItem>) => {
			patchUpload((state) => ({
				...state,
				items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
			}));
		},
		[patchUpload],
	);

	const saveNow = useCallback((): boolean => {
		const id = activeIdRef.current;
		if (!id) return false;
		if (!autoSaveEnabledRef.current) {
			showNotice(
				'error',
				'自动保存已暂停：请先备份损坏的草稿数据，再在顶部提示条中确认覆盖。',
			);
			return false;
		}
		const text = contentRef.current;
		if (text === lastSavedRef.current && !slugDirtyRef.current) {
			setStatus('saved');
			return true;
		}
		setStatus('saving');
		try {
			const now = Date.now();
			const next = draftsRef.current.map((draft) =>
				draft.id === id
					? {
							...draft,
							content: text,
							title: draft.titleLocked
								? draft.title
								: deriveDraftTitle(text, draft.title || '未命名草稿'),
							updatedAt: now,
						}
					: draft,
			);
			saveDrafts(next);
			saveActiveDraftId(id);
			draftsRef.current = next;
			setDrafts(next);
			lastSavedRef.current = text;
			slugDirtyRef.current = false;
			if (slugPersistTimerRef.current !== null) {
				window.clearTimeout(slugPersistTimerRef.current);
				slugPersistTimerRef.current = null;
			}
			setStatus('saved');
			return true;
		} catch (error) {
			setStatus('error');
			showNotice(
				'error',
				error instanceof DraftStorageError || error instanceof Error
					? error.message
					: '保存失败：本地存储不可用。',
			);
			return false;
		}
	}, [showNotice]);

	// Initial load: restore the last draft, or start a new one.
	useEffect(() => {
		const result = loadDrafts();
		if (!result.ok) {
			const ephemeral = createDraft();
			draftsRef.current = [ephemeral];
			activeIdRef.current = ephemeral.id;
			contentRef.current = ephemeral.content;
			lastSavedRef.current = ephemeral.content;
			autoSaveEnabledRef.current = false;
			setDrafts([ephemeral]);
			setActiveId(ephemeral.id);
			setContent(ephemeral.content);
			setAutoSaveEnabled(false);
			setStorageIssue({ message: result.message, raw: result.raw });
			setStatus('error');
			setPreviewPostId(derivePreviewPostId(ephemeral.content));
			setLoaded(true);
			return;
		}

		const lastId = loadActiveDraftId();
		let active = result.drafts.find((draft) => draft.id === lastId);
		if (!active && result.drafts.length > 0) {
			active = [...result.drafts].sort((a, b) => b.updatedAt - a.updatedAt)[0];
		}
		let nextDrafts = result.drafts;
		let initialStatus: SaveStatus = 'saved';

		if (!active) {
			active = createDraft();
			nextDrafts = [active];
			try {
				saveDrafts(nextDrafts);
				saveActiveDraftId(active.id);
			} catch (error) {
				initialStatus = 'error';
				showNotice(
					'error',
					error instanceof DraftStorageError || error instanceof Error
						? error.message
						: '无法初始化本地草稿。',
				);
			}
		}

		draftsRef.current = nextDrafts;
		activeIdRef.current = active.id;
		contentRef.current = active.content;
		lastSavedRef.current = active.content;
		setDrafts(nextDrafts);
		setActiveId(active.id);
		setContent(active.content);
		setStatus(initialStatus);
		setPreviewPostId(derivePreviewPostId(active.content));
		setLoaded(true);
	}, [showNotice]);

	// Debounced auto-save.
	useEffect(() => {
		if (!loaded || !activeId || !autoSaveEnabled) return;
		if (content === lastSavedRef.current) return;
		const timer = window.setTimeout(() => saveNow(), 600);
		return () => window.clearTimeout(timer);
	}, [content, activeId, loaded, autoSaveEnabled, saveNow]);

	/** Synchronous flush for pagehide/unmount (no React state updates). */
	const flushSave = useCallback(() => {
		if (!autoSaveEnabledRef.current) return;
		const id = activeIdRef.current;
		if (!id) return;
		const text = contentRef.current;
		const contentDirty = text !== lastSavedRef.current;
		if (!contentDirty && !slugDirtyRef.current) return;

		const next = contentDirty
			? draftsRef.current.map((draft) =>
					draft.id === id
						? {
								...draft,
								content: text,
								title: draft.titleLocked
									? draft.title
									: deriveDraftTitle(text, draft.title || '未命名草稿'),
								updatedAt: Date.now(),
							}
						: draft,
				)
			: draftsRef.current;

		try {
			saveDrafts(next);
			saveActiveDraftId(id);
			draftsRef.current = next;
			lastSavedRef.current = text;
			slugDirtyRef.current = false;
			if (slugPersistTimerRef.current !== null) {
				window.clearTimeout(slugPersistTimerRef.current);
				slugPersistTimerRef.current = null;
			}
		} catch {
			// Quota/private-mode failures are reported by saveNow in the UI.
		}
	}, []);

	useEffect(() => {
		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') flushSave();
		};
		window.addEventListener('pagehide', flushSave);
		document.addEventListener('visibilitychange', onVisibilityChange);
		document.addEventListener('astro:before-swap', flushSave);
		return () => {
			window.removeEventListener('pagehide', flushSave);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			document.removeEventListener('astro:before-swap', flushSave);
			flushSave();
		};
	}, [flushSave]);

	const handleChange = useCallback((value: string) => {
		if (value === contentRef.current) return;
		contentRef.current = value;
		setContent(value);
		setStatus(value === lastSavedRef.current ? 'saved' : 'unsaved');
		setPreviewPostId(derivePreviewPostId(value));
	}, []);

	const openDraft = useCallback(
		(id: string) => {
			if (!id || id === activeIdRef.current) return;
			if (contentRef.current !== lastSavedRef.current) {
				if (!autoSaveEnabledRef.current) {
					showNotice(
						'error',
						'自动保存已暂停：请先复制或下载当前内容，避免切换草稿时丢失修改。',
					);
					return;
				}
				if (!saveNow()) return;
			}
			const draft = draftsRef.current.find((item) => item.id === id);
			if (!draft) return;
			activeIdRef.current = id;
			contentRef.current = draft.content;
			lastSavedRef.current = draft.content;
			setActiveId(id);
			setContent(draft.content);
			setStatus('saved');
			saveActiveDraftId(id);
			setPreviewPostId(derivePreviewPostId(draft.content));
		},
		[saveNow],
	);

	const newDraft = useCallback(() => {
		if (contentRef.current !== lastSavedRef.current) {
			if (!autoSaveEnabledRef.current) {
				showNotice(
					'error',
					'自动保存已暂停：请先复制或下载当前内容，避免新建草稿时丢失修改。',
				);
				return;
			}
			if (!saveNow()) return;
		}
		const draft = createDraft();
		const next = [draft, ...draftsRef.current];
		let persisted = true;
		if (autoSaveEnabledRef.current) {
			try {
				saveDrafts(next);
				saveActiveDraftId(draft.id);
			} catch (error) {
				persisted = false;
				showNotice(
					'error',
					error instanceof Error ? error.message : '新草稿未能写入本地存储。',
				);
			}
		} else {
			persisted = false;
			showNotice('info', '自动保存已暂停，新草稿只存在于当前会话。');
		}
		setDraftList(next);
		activeIdRef.current = draft.id;
		contentRef.current = draft.content;
		lastSavedRef.current = draft.content;
		setActiveId(draft.id);
		setContent(draft.content);
		setStatus(persisted ? 'saved' : 'error');
		setPreviewPostId(derivePreviewPostId(draft.content));
	}, [saveNow, setDraftList, showNotice]);

	const confirmRename = useCallback(
		(title: string) => {
			const id = activeIdRef.current;
			if (!id) return;
			const next = draftsRef.current.map((draft) =>
				draft.id === id ? { ...draft, title, titleLocked: true, updatedAt: Date.now() } : draft,
			);
			setDraftList(next);
			setRenameOpen(false);
			if (autoSaveEnabledRef.current) {
				try {
					saveDrafts(next);
					showNotice('success', '草稿已重命名。');
				} catch (error) {
					setStatus('error');
					showNotice('error', error instanceof Error ? error.message : '重命名未能保存。');
				}
			} else {
				showNotice('info', '自动保存已暂停，重命名仅在当前会话生效。');
			}
		},
		[setDraftList, showNotice],
	);

	const confirmDelete = useCallback(() => {
		const id = activeIdRef.current;
		if (!id) return;
		const remaining = draftsRef.current.filter((draft) => draft.id !== id);
		const nextActive =
			[...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? createDraft();
		const next = remaining.length > 0 ? remaining : [nextActive];
		setDraftList(next);
		setDeleteOpen(false);

		activeIdRef.current = nextActive.id;
		contentRef.current = nextActive.content;
		lastSavedRef.current = nextActive.content;
		setActiveId(nextActive.id);
		setContent(nextActive.content);
		setPreviewPostId(derivePreviewPostId(nextActive.content));

		if (autoSaveEnabledRef.current) {
			try {
				saveDrafts(next);
				saveActiveDraftId(nextActive.id);
				setStatus('saved');
				showNotice('success', '草稿已删除。');
			} catch (error) {
				setStatus('error');
				showNotice('error', error instanceof Error ? error.message : '删除未能保存。');
			}
		} else {
			setStatus('error');
			showNotice('info', '自动保存已暂停，删除仅在当前会话生效。');
		}
	}, [setDraftList, showNotice]);

	const importText = useCallback(
		(text: string, fileName: string) => {
			if (contentRef.current !== lastSavedRef.current) {
				if (!autoSaveEnabledRef.current) {
					showNotice(
						'error',
						'自动保存已暂停：请先复制或下载当前内容，避免导入时丢失修改。',
					);
					return;
				}
				if (!saveNow()) return;
			}
			const fallback = fileName.replace(/\.[^.]+$/, '') || '导入的草稿';
			const title = getFrontmatterTitle(text) || deriveDraftTitle(text, fallback);
			const draft: Draft = { ...createDraft(), title, content: text };
			const next = [draft, ...draftsRef.current];
			let persisted = true;
			if (autoSaveEnabledRef.current) {
				try {
					saveDrafts(next);
					saveActiveDraftId(draft.id);
				} catch (error) {
					persisted = false;
					showNotice(
						'error',
						error instanceof Error ? error.message : '导入的草稿未能写入本地存储。',
					);
				}
			}
			setDraftList(next);
			activeIdRef.current = draft.id;
			contentRef.current = text;
			lastSavedRef.current = text;
			setActiveId(draft.id);
			setContent(text);
			setStatus(persisted ? 'saved' : 'error');
			setPreviewPostId(derivePreviewPostId(text));
			if (persisted) showNotice('success', `已导入 ${fileName} 为新草稿。`);
		},
		[setDraftList, showNotice, saveNow],
	);

	const handleImportFile = useCallback(
		async (file: File) => {
			try {
				const text = await readTextFile(file);
				importText(text, file.name);
			} catch {
				showNotice('error', '读取 Markdown 文件失败。');
			}
		},
		[importText, showNotice],
	);

	const handleImportInput = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			event.target.value = '';
			if (file) void handleImportFile(file);
		},
		[handleImportFile],
	);

	const handleCopy = useCallback(async () => {
		const copied = await copyText(contentRef.current);
		showNotice(
			copied ? 'success' : 'error',
			copied
				? '已复制完整 Markdown。'
				: '复制失败：浏览器不允许访问剪贴板，请手动选择并复制。',
		);
	}, [showNotice]);

	const handleDownload = useCallback(() => {
		const active = draftsRef.current.find((draft) => draft.id === activeIdRef.current);
		const filename = deriveMarkdownFilename(
			contentRef.current,
			active?.title ?? 'draft',
			active?.slug,
		);
		downloadText(contentRef.current, filename);
		showNotice('success', `已下载 ${filename}`);
	}, [showNotice]);

	const handleManualSave = useCallback(() => {
		if (saveNow()) showNotice('success', '草稿已保存到本机。');
	}, [saveNow, showNotice]);

	const applySettings = useCallback(
		(next: WebDavSettings) => {
			settingsRef.current = next;
			setSettings(next);
			setSettingsOpen(false);
			try {
				saveWebDavSettings(next);
				showNotice('success', '设置已保存。');
			} catch (error) {
				showNotice('error', error instanceof Error ? error.message : 'WebDAV 设置保存失败。');
			}
		},
		[showNotice],
	);

	const buildItems = useCallback((files: File[], slug: string): UploadItem[] => {
		const used = new Set<string>();
		const now = new Date();
		return files.map((file, index) => ({
			id: `upload-${Date.now()}-${index}`,
			file,
			target: buildRemoteTarget(file, settingsRef.current, {
				now,
				usedNames: used,
				slug,
				index: index + 1,
			}),
			status: 'pending',
			progress: 0,
		}));
	}, []);

	const handleDroppedFiles = useCallback(
		(files: File[]) => {
			if (files.length === 0) return;
			const markdownFiles = files.filter(isMarkdownFile);
			if (markdownFiles.length > 0) {
				const file = markdownFiles[0];
				setImportDrop({
					fileName: file.name,
					fileSize: file.size,
					ignoredCount: files.length - 1,
					file,
				});
				return;
			}
			const slug = getActiveSlug().trim();
			if (!slug) {
				showNotice('error', '请先填写 Slug 再上传文件。');
				focusSlug();
				return;
			}
			const slugError = validateSlug(slug);
			if (slugError) {
				showNotice('error', slugError);
				focusSlug();
				return;
			}
			if (!isWebDavConfigured(settingsRef.current)) {
				setSettingsOpen(true);
				showNotice('info', '请先配置 WebDAV。');
				return;
			}
			let items: UploadItem[];
			try {
				items = buildItems(files, slug);
			} catch (error) {
				showNotice(
					'error',
					error instanceof Error ? error.message : '上传路径格式无效。',
				);
				setSettingsOpen(true);
				return;
			}
			uploadCallbackRef.current = null;
			callbackDeliveredRef.current = false;
			setUploadState({
				open: true,
				mode: 'insert',
				items,
				uploading: false,
				slug,
			});
		},
		[buildItems, focusSlug, getActiveSlug, setUploadState, showNotice],
	);

	const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
		if (!Array.from(event.dataTransfer.types).includes('Files')) return;
		event.preventDefault();
		dragDepthRef.current += 1;
		setDragActive(true);
	}, []);

	const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
		if (!Array.from(event.dataTransfer.types).includes('Files')) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	}, []);

	const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
		if (dragDepthRef.current === 0) return;
		event.preventDefault();
		// Leaving the window entirely: reset even if the enter/leave counts
		// drifted because child elements were added or removed mid-drag.
		if (event.relatedTarget === null) {
			dragDepthRef.current = 0;
			setDragActive(false);
			return;
		}
		dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
		if (dragDepthRef.current === 0) setDragActive(false);
	}, []);

	const handleDrop = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (!Array.from(event.dataTransfer.types).includes('Files')) return;
			event.preventDefault();
			dragDepthRef.current = 0;
			setDragActive(false);
			handleDroppedFiles(Array.from(event.dataTransfer.files));
		},
		[handleDroppedFiles],
	);

	const handleUploadImg = useCallback(
		(files: File[], callback: UploadImgCallBack) => {
			if (files.length === 0) return;
			const slug = getActiveSlug().trim();
			if (!slug) {
				callback([]);
				showNotice('error', '请先填写 Slug 再上传图片。');
				focusSlug();
				return;
			}
			const slugError = validateSlug(slug);
			if (slugError) {
				callback([]);
				showNotice('error', slugError);
				focusSlug();
				return;
			}
			if (!isWebDavConfigured(settingsRef.current)) {
				callback([]);
				setSettingsOpen(true);
				showNotice('info', '请先配置 WebDAV。');
				return;
			}
			let items: UploadItem[];
			try {
				items = buildItems(files, slug);
			} catch (error) {
				callback([]);
				showNotice(
					'error',
					error instanceof Error ? error.message : '上传路径格式无效。',
				);
				setSettingsOpen(true);
				return;
			}
			uploadCallbackRef.current = callback;
			callbackDeliveredRef.current = false;
			setUploadState({
				open: true,
				mode: 'callback',
				items,
				uploading: false,
				slug,
			});
		},
		[buildItems, focusSlug, getActiveSlug, setUploadState, showNotice],
	);

	const startUpload = useCallback(async () => {
		const current = uploadRef.current;
		if (!current || current.uploading) return;

		const slug = current.slug.trim();
		const slugError = validateSlug(slug);
		if (!slug || slugError) {
			if (current.mode === 'callback' && !callbackDeliveredRef.current) {
				uploadCallbackRef.current?.([]);
				callbackDeliveredRef.current = true;
			}
			setUploadState(null);
			showNotice('error', !slug ? '请先填写 Slug 再上传。' : (slugError ?? 'Slug 无效。'));
			window.setTimeout(focusSlug, 0);
			return;
		}

		const controller = new AbortController();
		uploadAbortRef.current = controller;
		patchUpload((state) => ({ ...state, uploading: true }));

		for (const item of current.items) {
			if (controller.signal.aborted) {
				updateItem(item.id, { status: 'canceled' });
				continue;
			}
			updateItem(item.id, { status: 'uploading', progress: 0, error: undefined });
			try {
				await uploadFile(
					settingsRef.current,
					item.file,
					item.target,
					(progress) => updateItem(item.id, { progress }),
					controller.signal,
				);
				updateItem(item.id, { status: 'done', progress: 100 });
			} catch (error) {
				if (controller.signal.aborted) {
					updateItem(item.id, { status: 'canceled' });
				} else {
					const message =
						error instanceof WebDavError ? error.message : '上传失败：未知错误。';
					updateItem(item.id, { status: 'error', error: message });
				}
			}
		}

		patchUpload((state) => ({ ...state, uploading: false }));
		uploadAbortRef.current = null;
	}, [focusSlug, patchUpload, setUploadState, showNotice, updateItem]);

	const cancelUpload = useCallback(() => {
		uploadAbortRef.current?.abort();
		uploadAbortRef.current = null;
		patchUpload((state) => ({
			...state,
			uploading: false,
			items: state.items.map((item) =>
				item.status === 'pending' || item.status === 'uploading'
					? { ...item, status: 'canceled' }
					: item,
			),
		}));
	}, [patchUpload]);

	const retryUpload = useCallback(
		async (id: string) => {
			const current = uploadRef.current;
			const item = current?.items.find((candidate) => candidate.id === id);
			if (!item || !current || current.uploading) return;
			const controller = new AbortController();
			uploadAbortRef.current = controller;
			patchUpload((state) => ({ ...state, uploading: true }));
			updateItem(id, { status: 'uploading', progress: 0, error: undefined });
			try {
				await uploadFile(
					settingsRef.current,
					item.file,
					item.target,
					(progress) => updateItem(id, { progress }),
					controller.signal,
				);
				updateItem(id, { status: 'done', progress: 100 });
			} catch (error) {
				const message = error instanceof WebDavError ? error.message : '上传失败：未知错误。';
				updateItem(id, { status: 'error', error: message });
			} finally {
				patchUpload((state) => ({ ...state, uploading: false }));
				uploadAbortRef.current = null;
			}
		},
		[patchUpload, updateItem],
	);

	const finishUpload = useCallback(() => {
		const current = uploadRef.current;
		if (!current) return;
		const done = current.items.filter((item) => item.status === 'done');
		const failed = current.items.filter((item) => item.status === 'error').length;

		if (current.mode === 'callback') {
			uploadCallbackRef.current?.(done.map((item) => item.target.publicUrl));
			callbackDeliveredRef.current = true;
		} else if (done.length > 0) {
			const markdown = done.map(uploadMarkdown).join('\n');
			const editor = editorRef.current;
			if (editor) {
				editor.insert(() => ({ targetValue: `\n${markdown}\n`, select: false }));
			} else {
				const nextContent = `${contentRef.current}\n${markdown}\n`;
				contentRef.current = nextContent;
				setContent(nextContent);
				setStatus('unsaved');
				showNotice('info', '编辑器尚未就绪，链接已追加到文末。');
			}
		}

		if (failed > 0) {
			showNotice('error', `${done.length} 个文件已上传，${failed} 个失败。`);
		} else if (done.length > 0) {
			showNotice('success', `已处理 ${done.length} 个文件。`);
		}
		setUploadState(null);
	}, [setUploadState, showNotice]);

	const closeUpload = useCallback(() => {
		if (uploadRef.current?.mode === 'callback' && !callbackDeliveredRef.current) {
			uploadCallbackRef.current?.([]);
			callbackDeliveredRef.current = true;
		}
		uploadAbortRef.current?.abort();
		uploadAbortRef.current = null;
		setUploadState(null);
	}, [setUploadState]);

	const confirmImportDrop = useCallback(() => {
		const dropped = importDrop;
		setImportDrop(null);
		if (dropped) void handleImportFile(dropped.file);
	}, [importDrop, handleImportFile]);

	const downloadRawDrafts = useCallback(() => {
		const raw = storageIssue?.raw ?? readRawDrafts() ?? '';
		downloadText(raw, 'writing-room-drafts-backup.json', 'application/json;charset=utf-8');
		showNotice('success', '已下载原始草稿数据备份。');
	}, [storageIssue, showNotice]);

	const enableAutoSave = useCallback(() => {
		autoSaveEnabledRef.current = true;
		setAutoSaveEnabled(true);
		setStorageIssue(null);
		setOverwriteOpen(false);
		try {
			saveDrafts(draftsRef.current);
			if (activeIdRef.current) saveActiveDraftId(activeIdRef.current);
			setStatus('saved');
			showNotice('success', '已启用自动保存。');
		} catch (error) {
			setStatus('error');
			showNotice('error', error instanceof Error ? error.message : '写入本地存储失败。');
		}
	}, [showNotice]);

	const handleEditorRef = useCallback((instance: unknown) => {
		editorRef.current = (instance as ExposeParam | null) ?? null;
		setEditorReady(instance !== null);
	}, []);

	// Keep the editor's split/preview-only state in sync with the viewport.
	useEffect(() => {
		const editor = editorRef.current;
		if (!editor || !editorReady) return;
		if (isMobile) {
			if (mobileView === 'preview') {
				editor.togglePreviewOnly(true);
			} else {
				editor.togglePreviewOnly(false);
				editor.togglePreview(false);
			}
		} else {
			editor.togglePreviewOnly(false);
			editor.togglePreview(true);
		}
	}, [isMobile, mobileView, editorReady]);

	// Keyboard shortcuts. The editor also has its own save shortcut; saveNow is
	// idempotent, so a double invocation is harmless.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const modifier = event.metaKey || event.ctrlKey;
			if (!modifier) return;
			const key = event.key.toLowerCase();
			if (key === 's' && !event.shiftKey) {
				event.preventDefault();
				saveNow();
			} else if (key === 'c' && event.shiftKey) {
				event.preventDefault();
				void handleCopy();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [saveNow, handleCopy]);

	const activeDraft = useMemo(
		() => drafts.find((draft) => draft.id === activeId) ?? null,
		[drafts, activeId],
	);
	const wordCount = useMemo(() => countWords(content), [content]);
	const activeSlug = activeDraft?.slug ?? '';
	const slugError = validateSlug(activeSlug);

	return {
		// state
		drafts,
		activeId,
		activeDraft,
		activeSlug,
		slugError,
		content,
		wordCount,
		status,
		loaded,
		autoSaveEnabled,
		storageIssue,
		notice,
		settings,
		settingsOpen,
		renameOpen,
		deleteOpen,
		overwriteOpen,
		importDrop,
		upload,
		dragActive,
		mobileView,
		isMobile,
		editorReady,
		importInputRef,
		// actions
		handleChange,
		handleSlugChange,
		focusSlug,
		slugInputRef,
		handleEditorRef,
		handleDroppedFiles,
		handleUploadImg,
		handleDragEnter,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		openDraft,
		newDraft,
		confirmRename,
		confirmDelete,
		saveNow,
		handleManualSave,
		handleCopy,
		handleDownload,
		handleImportFile,
		handleImportInput,
		applySettings,
		startUpload,
		cancelUpload,
		retryUpload,
		finishUpload,
		closeUpload,
		confirmImportDrop,
		downloadRawDrafts,
		enableAutoSave,
		setSettingsOpen,
		setRenameOpen,
		setDeleteOpen,
		setOverwriteOpen,
		setImportDrop,
		setMobileView,
	};
}

export type WritingRoom = ReturnType<typeof useWritingRoom>;
