import { useCallback, useSyncExternalStore } from 'react';

export type SiteTheme = 'light' | 'dark';

function readTheme(): SiteTheme {
	if (typeof document === 'undefined') return 'light';
	return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function subscribeTheme(callback: () => void): () => void {
	if (typeof window === 'undefined') return () => {};

	const onThemeChange = (event: Event) => {
		const detail = (event as CustomEvent<unknown>).detail;
		if (detail === 'light' || detail === 'dark' || detail === undefined) callback();
	};
	const onStorage = (event: StorageEvent) => {
		if (event.key === null || event.key === 'theme') callback();
	};
	const observer = new MutationObserver(callback);

	window.addEventListener('theme-change', onThemeChange);
	window.addEventListener('storage', onStorage);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme'],
	});

	return () => {
		window.removeEventListener('theme-change', onThemeChange);
		window.removeEventListener('storage', onStorage);
		observer.disconnect();
	};
}

/** Follow the site's `data-theme` attribute (ThemeToggle dispatches theme-change). */
export function useSiteTheme(): SiteTheme {
	return useSyncExternalStore(subscribeTheme, readTheme, () => 'light');
}

/** Reactive `matchMedia` without hydration warnings (server snapshot = false). */
export function useMediaQuery(query: string): boolean {
	const subscribe = useCallback(
		(callback: () => void) => {
			if (typeof window === 'undefined') return () => {};
			const media = window.matchMedia(query);
			media.addEventListener('change', callback);
			return () => media.removeEventListener('change', callback);
		},
		[query],
	);

	const getSnapshot = useCallback(() => {
		if (typeof window === 'undefined') return false;
		return window.matchMedia(query).matches;
	}, [query]);

	return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
