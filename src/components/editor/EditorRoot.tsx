import type { Ref } from 'react';
import { MdEditor, config } from 'md-editor-rt';
import type { Footers, ToolbarNames } from 'md-editor-rt';
import hljs from 'highlight.js/lib/common';
import Cropper from 'cropperjs';
import 'md-editor-rt/lib/style.css';
import 'highlight.js/styles/atom-one-dark.css';
import 'cropperjs/dist/cropper.css';
import { useSiteTheme } from './hooks';
import { useWritingRoom } from './useWritingRoom';
import type { Draft, MobileView, SaveStatus } from './useWritingRoom';
import { formatTimestamp } from './lib/document';
import {
	ConfirmDialog,
	MarkdownDropDialog,
	TextPromptDialog,
	UploadDialog,
	WebDavSettingsDialog,
} from './dialogs';
import { configureMarkdownIt } from './lib/markdown-preview';
import './editor.css';

// Register the blog's custom Markdown dialect once for md-editor-rt's
// markdown-it instance. Raw HTML stays disabled inside the preview.
config({
	markdownItConfig: configureMarkdownIt,
	editorExtensions: {
		// Supply optional libraries locally; md-editor-rt would otherwise fetch
		// highlight.js and cropper.js from unpkg when the editor mounts.
		highlight: { instance: hljs },
		cropper: { instance: Cropper },
	},
	editorConfig: {
		renderDelay: 80,
	},
});

const TOOLBARS: ToolbarNames[] = [
	'bold',
	'underline',
	'italic',
	'strikeThrough',
	'-',
	'title',
	'sub',
	'sup',
	'quote',
	'unorderedList',
	'orderedList',
	'task',
	'-',
	'codeRow',
	'code',
	'link',
	'image',
	'table',
	'-',
	'revoke',
	'next',
	'save',
	'-',
	'preview',
	'previewOnly',
	'catalog',
	'pageFullscreen',
];

const FOOTERS: Footers[] = ['markdownTotal', 'scrollSwitch', '='];

const STATUS_LABEL: Record<SaveStatus, string> = {
	saved: '已保存',
	saving: '保存中…',
	unsaved: '未保存',
	error: '保存失败',
};

interface EditorTopBarProps {
	drafts: Draft[];
	activeId: string | null;
	slug: string;
	slugError: string | null;
	slugInputRef: Ref<HTMLInputElement>;
	onSlugChange: (value: string) => void;
	status: SaveStatus;
	wordCount: number;
	autoSaveEnabled: boolean;
	isMobile: boolean;
	mobileView: MobileView;
	onSelectDraft: (id: string) => void;
	onNewDraft: () => void;
	onRenameDraft: () => void;
	onDeleteDraft: () => void;
	onSave: () => void;
	onCopy: () => void;
	onDownload: () => void;
	onImport: () => void;
	onOpenSettings: () => void;
	onMobileViewChange: (view: MobileView) => void;
}

function EditorTopBar({
	drafts,
	activeId,
	slug,
	slugError,
	slugInputRef,
	onSlugChange,
	status,
	wordCount,
	autoSaveEnabled,
	isMobile,
	mobileView,
	onSelectDraft,
	onNewDraft,
	onRenameDraft,
	onDeleteDraft,
	onSave,
	onCopy,
	onDownload,
	onImport,
	onOpenSettings,
	onMobileViewChange,
}: EditorTopBarProps) {
	return (
		<div className="wr-topbar">
			<div className="wr-group wr-group-grow">
				<label className="wr-select-label">
					<span className="wr-sr-only">选择草稿</span>
					<select
						className="wr-select"
						value={activeId ?? ''}
						onChange={(event) => onSelectDraft(event.target.value)}
						aria-label="选择草稿"
					>
						{drafts.length === 0 ? <option value="">（无草稿）</option> : null}
						{drafts.map((draft) => (
							<option key={draft.id} value={draft.id}>
								{draft.title} · {formatTimestamp(draft.updatedAt)}
							</option>
						))}
					</select>
				</label>
				<button type="button" className="wr-btn" onClick={onNewDraft} title="新建草稿">
					新建
				</button>
				<button
					type="button"
					className="wr-btn"
					onClick={onRenameDraft}
					disabled={!activeId}
					title="重命名当前草稿"
				>
					重命名
				</button>
				<button
					type="button"
					className="wr-btn"
					onClick={onDeleteDraft}
					disabled={!activeId}
					title="删除当前草稿"
				>
					删除
				</button>
			</div>

			<div className="wr-slug-field">
				<label className="wr-slug-label">
					<span className="wr-slug-caption">Slug</span>
					<input
						ref={slugInputRef}
						className="wr-slug-input"
						type="text"
						value={slug}
						onChange={(event) => onSlugChange(event.target.value)}
						placeholder="上传前必填"
						title="下载文件名与上传路径使用"
						aria-invalid={slugError !== null}
						aria-describedby={slugError ? 'wr-slug-error' : undefined}
					/>
				</label>
				{slugError ? (
					<span id="wr-slug-error" className="wr-slug-error">
						{slugError}
					</span>
				) : null}
			</div>

			<div className="wr-group wr-meta">
				<span
					className={`wr-status wr-status-${status}`}
					title={autoSaveEnabled ? '自动保存到本机' : '自动保存已暂停'}
				>
					<span className="wr-dot" aria-hidden="true" />
					{STATUS_LABEL[status]}
					{!autoSaveEnabled ? '（自动保存已暂停）' : ''}
				</span>
				<span className="wr-count">{wordCount} 字</span>
			</div>

			<div className="wr-group wr-actions">
				<button type="button" className="wr-btn wr-btn-primary" onClick={onSave} title="保存（Ctrl/⌘+S）">
					保存
				</button>
				<button type="button" className="wr-btn" onClick={onCopy} title="复制完整 Markdown">
					复制
				</button>
				<button type="button" className="wr-btn" onClick={onDownload} title="下载 .md 文件">
					下载
				</button>
				<button type="button" className="wr-btn" onClick={onImport} title="导入本地 Markdown 为新草稿">
					导入
				</button>
				<button type="button" className="wr-btn" onClick={onOpenSettings} title="配置 WebDAV 上传">
					WebDAV 设置
				</button>
				{isMobile ? (
					<div className="wr-segmented" role="group" aria-label="编辑或预览">
						<button
							type="button"
							className={mobileView === 'edit' ? 'wr-seg-btn active' : 'wr-seg-btn'}
							onClick={() => onMobileViewChange('edit')}
							aria-pressed={mobileView === 'edit'}
						>
							编辑
						</button>
						<button
							type="button"
							className={mobileView === 'preview' ? 'wr-seg-btn active' : 'wr-seg-btn'}
							onClick={() => onMobileViewChange('preview')}
							aria-pressed={mobileView === 'preview'}
						>
							预览
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}

export default function EditorRoot() {
	const room = useWritingRoom();
	const theme = useSiteTheme();

	if (!room.loaded) {
		return (
			<div className="wr-loading" role="status">
				读取草稿…
			</div>
		);
	}

	return (
		<div
			className="koharu-writing-room wr-shell"
			onDragEnter={room.handleDragEnter}
			onDragOver={room.handleDragOver}
			onDragLeave={room.handleDragLeave}
			onDrop={room.handleDrop}
		>
			{room.storageIssue ? (
				<div className="wr-banner wr-banner-error" role="alert">
					<div>
						<strong>本地草稿读取失败</strong>
						<p>{room.storageIssue.message}</p>
					</div>
					<div className="wr-banner-actions">
						<button type="button" className="wr-btn wr-btn-small" onClick={room.downloadRawDrafts}>
							下载原始数据
						</button>
						<button
							type="button"
							className="wr-btn wr-btn-small wr-btn-danger"
							onClick={() => room.setOverwriteOpen(true)}
						>
							覆盖并启用
						</button>
					</div>
				</div>
			) : null}

			<EditorTopBar
				drafts={room.drafts}
				activeId={room.activeId}
				slug={room.activeSlug}
				slugError={room.slugError}
				slugInputRef={room.slugInputRef}
				onSlugChange={room.handleSlugChange}
				status={room.status}
				wordCount={room.wordCount}
				autoSaveEnabled={room.autoSaveEnabled}
				isMobile={room.isMobile}
				mobileView={room.mobileView}
				onSelectDraft={room.openDraft}
				onNewDraft={room.newDraft}
				onRenameDraft={() => room.setRenameOpen(true)}
				onDeleteDraft={() => room.setDeleteOpen(true)}
				onSave={room.handleManualSave}
				onCopy={() => void room.handleCopy()}
				onDownload={room.handleDownload}
				onImport={() => room.importInputRef.current?.click()}
				onOpenSettings={() => room.setSettingsOpen(true)}
				onMobileViewChange={room.setMobileView}
			/>

			{room.notice ? (
				<div className={`wr-notice is-${room.notice.tone}`} role="status">
					{room.notice.message}
				</div>
			) : null}

			<div className="wr-workspace">
				<MdEditor
					ref={room.handleEditorRef}
					value={room.content}
					onChange={room.handleChange}
					onSave={() => {
						room.saveNow();
					}}
					onUploadImg={room.handleUploadImg}
					theme={theme}
					language="zh-CN"
					className="prose"
					style={{ height: '100%' }}
					preview
					toolbars={TOOLBARS}
					footers={FOOTERS}
					placeholder="开始写作……"
					sanitize={(html) => html}
					noPrettier
					noMermaid
					noKatex
					noEcharts
				/>
				{room.dragActive ? (
					<div className="wr-drop-overlay" role="status">
						<div className="wr-drop-card">
							<strong>松开以选择上传文件</strong>
							<span>上传前会确认路径与链接。</span>
						</div>
					</div>
				) : null}
			</div>

			<p className="wr-footnote">
				支持 :::fold、:::tab、&gt; [!NOTE]；加密块预览显示占位。
			</p>

			<input
				ref={room.importInputRef}
				type="file"
				accept=".md,.markdown,text/markdown"
				hidden
				onChange={room.handleImportInput}
			/>

			<WebDavSettingsDialog
				open={room.settingsOpen}
				settings={room.settings}
				onClose={() => room.setSettingsOpen(false)}
				onSave={room.applySettings}
			/>

			<TextPromptDialog
				open={room.renameOpen}
				title="重命名草稿"
				label="草稿名称"
				initialValue={room.activeDraft?.title ?? ''}
				confirmLabel="重命名"
				onConfirm={room.confirmRename}
				onClose={() => room.setRenameOpen(false)}
			/>

			<ConfirmDialog
				open={room.deleteOpen}
				title="删除草稿"
				message={`确定删除「${room.activeDraft?.title ?? '当前草稿'}」吗？此操作不可撤销。`}
				confirmLabel="删除"
				danger
				onConfirm={room.confirmDelete}
				onClose={() => room.setDeleteOpen(false)}
			/>

			<ConfirmDialog
				open={room.overwriteOpen}
				title="覆盖损坏的草稿数据"
				message="当前草稿数据无法解析，继续会覆盖且无法恢复。建议先下载备份。"
				confirmLabel="覆盖并启用"
				danger
				onConfirm={room.enableAutoSave}
				onClose={() => room.setOverwriteOpen(false)}
			/>

			<MarkdownDropDialog
				open={room.importDrop !== null}
				fileName={room.importDrop?.fileName ?? ''}
				fileSize={room.importDrop?.fileSize ?? 0}
				ignoredCount={room.importDrop?.ignoredCount ?? 0}
				onImport={room.confirmImportDrop}
				onClose={() => room.setImportDrop(null)}
			/>

			{room.upload ? (
				<UploadDialog
					open={room.upload.open}
					items={room.upload.items}
					mode={room.upload.mode}
					uploading={room.upload.uploading}
					slug={room.upload.slug}
					onStart={() => void room.startUpload()}
					onCancelUpload={room.cancelUpload}
					onClose={room.closeUpload}
					onRetry={(id) => void room.retryUpload(id)}
					onFinish={room.finishUpload}
				/>
			) : null}
		</div>
	);
}
