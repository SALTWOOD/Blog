// Article translation via Bilibili's free public Index-Translate API.
//
// The request is made from the reader's browser (the endpoint sends
// `access-control-allow-origin: *` and needs no API key), so translation is
// strictly opt-in: nothing is sent until the reader presses Translate.
//
// Policy note (checked 2026-10-25): the endpoint is anonymous and CORS-open,
// but there is no formal ToS. Operator statements in the project's issue
// tracker describe it as intended for academic exchange, development/testing
// and feature evaluation — explicitly *not* recommended for end-user-facing
// products — and promise no SLA; it may be throttled or shut down at any time.
// This integration therefore stays opt-in, concurrency-limited, chunked,
// attributed, and sends only the article's own title/body. If you need
// reliability, pre-translate at build time or self-host the Apache-2.0
// weights (see github.com/bilibili/Index-Translate) instead of calling this
// hosted endpoint from visitors' browsers.
//
// Flip `enabled` to false to remove the toast, the in-article button and the
// client bundle from article pages.

export interface TranslateConfig {
	enabled: boolean;
	/** OpenAI-compatible chat-completions endpoint. */
	endpoint: string;
	/** Model id advertised by the service. */
	model: string;
	/** Shown in the toast's attribution line. */
	providerName: string;
	providerUrl: string;
}

export const TRANSLATE: TranslateConfig = {
	enabled: true,
	endpoint: 'https://index-translate.bilibili.com/v1/chat/completions',
	model: 'Index-Translate-9B',
	providerName: 'Bilibili Index-Translate',
	providerUrl: 'https://index-translate.bilibili.com/',
};
