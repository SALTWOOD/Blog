// Browser-language detection and the selectable target languages for the
// article translator.
//
// The toast only appears when the reader's *preferred* language (the first
// entry of `navigator.languages`) is not Chinese. That browser language is
// preselected in the language picker; the reader can switch to any language
// below and the choice is remembered for the rest of the tab's session.
//
// The Chinese `promptName` is what the model prompt asks for, matching the
// canonical names in Index-Translate's own `call_api.py`. English and native
// names are only used in the picker.

export interface LanguageInfo {
	/** Chinese language name understood by the model prompt, e.g. "英语". */
	promptName: string;
	/** English display name, e.g. "English". */
	englishName: string;
	/** Native display name, e.g. "日本語". */
	nativeName: string;
}

export interface LanguageOption extends LanguageInfo {
	/** Primary BCP-47 subtag, e.g. "en". */
	code: string;
}

export interface TargetLanguage extends LanguageInfo {
	code: string;
	/** Tag used for <html lang>, e.g. "en-US" or "ja". */
	tag: string;
}

/**
 * Curated supported list. Keep these codes/names in sync with the model's
 * advertised languages; the picker is the only place readers choose a target.
 */
export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
	{ code: 'en', promptName: '英语', englishName: 'English', nativeName: 'English' },
	{ code: 'ja', promptName: '日语', englishName: 'Japanese', nativeName: '日本語' },
	{ code: 'ru', promptName: '俄语', englishName: 'Russian', nativeName: 'Русский' },
	{ code: 'ko', promptName: '韩语', englishName: 'Korean', nativeName: '한국어' },
	{ code: 'fr', promptName: '法语', englishName: 'French', nativeName: 'Français' },
	{ code: 'de', promptName: '德语', englishName: 'German', nativeName: 'Deutsch' },
	{ code: 'es', promptName: '西班牙语', englishName: 'Spanish', nativeName: 'Español' },
	{ code: 'pt', promptName: '葡萄牙语', englishName: 'Portuguese', nativeName: 'Português' },
	{ code: 'it', promptName: '意大利语', englishName: 'Italian', nativeName: 'Italiano' },
	{ code: 'nl', promptName: '荷兰语', englishName: 'Dutch', nativeName: 'Nederlands' },
	{ code: 'pl', promptName: '波兰语', englishName: 'Polish', nativeName: 'Polski' },
	{ code: 'tr', promptName: '土耳其语', englishName: 'Turkish', nativeName: 'Türkçe' },
	{ code: 'vi', promptName: '越南语', englishName: 'Vietnamese', nativeName: 'Tiếng Việt' },
	{ code: 'th', promptName: '泰语', englishName: 'Thai', nativeName: 'ไทย' },
	{ code: 'id', promptName: '印尼语', englishName: 'Indonesian', nativeName: 'Bahasa Indonesia' },
	{ code: 'ms', promptName: '马来语', englishName: 'Malay', nativeName: 'Bahasa Melayu' },
	{ code: 'fil', promptName: '菲律宾语', englishName: 'Filipino', nativeName: 'Filipino' },
	{ code: 'hi', promptName: '印地语', englishName: 'Hindi', nativeName: 'हिन्दी' },
	{ code: 'ar', promptName: '阿拉伯语', englishName: 'Arabic', nativeName: 'العربية' },
	{ code: 'uk', promptName: '乌克兰语', englishName: 'Ukrainian', nativeName: 'Українська' },
	{ code: 'fa', promptName: '波斯语', englishName: 'Persian', nativeName: 'فارسی' },
	{ code: 'cs', promptName: '捷克语', englishName: 'Czech', nativeName: 'Čeština' },
	{ code: 'el', promptName: '希腊语', englishName: 'Greek', nativeName: 'Ελληνικά' },
	{ code: 'da', promptName: '丹麦语', englishName: 'Danish', nativeName: 'Dansk' },
	{ code: 'fi', promptName: '芬兰语', englishName: 'Finnish', nativeName: 'Suomi' },
	{ code: 'hu', promptName: '匈牙利语', englishName: 'Hungarian', nativeName: 'Magyar' },
	{ code: 'nb', promptName: '书面挪威语', englishName: 'Norwegian', nativeName: 'Norsk bokmål' },
	{ code: 'ro', promptName: '罗马尼亚语', englishName: 'Romanian', nativeName: 'Română' },
	{ code: 'sk', promptName: '斯洛伐克语', englishName: 'Slovak', nativeName: 'Slovenčina' },
	{ code: 'bg', promptName: '保加利亚语', englishName: 'Bulgarian', nativeName: 'Български' },
	{ code: 'sv', promptName: '瑞典语', englishName: 'Swedish', nativeName: 'Svenska' },
];

const LANGUAGES = Object.fromEntries(
	SUPPORTED_LANGUAGES.map(({ code, ...info }) => [code, info]),
) as Record<string, LanguageInfo>;

/** Legacy/regional tags that map onto a canonical option. */
const ALIASES: Record<string, string> = {
	no: 'nb',
	tl: 'fil',
	in: 'id',
};

/** Primary subtags that mean the reader already reads Chinese. */
const CHINESE_PRIMARY = new Set([
	'zh',
	'yue',
	'cmn',
	'wuu',
	'nan',
	'hak',
	'gan',
	'hsn',
	'lzh',
	'cjy',
	'cdo',
	'cpx',
	'czh',
	'mnp',
]);

function makeTarget(code: string, info: LanguageInfo, tag: string): TargetLanguage {
	return { code, ...info, tag };
}

/** Build a target from a picker/session value; null if unsupported. */
export function languageFromCode(code: string): TargetLanguage | null {
	const primary = code.trim().toLowerCase().split('-')[0];
	if (!primary) return null;
	const canonical = ALIASES[primary] ?? primary;
	const info = LANGUAGES[canonical];
	if (!info) return null;
	return makeTarget(canonical, info, canonical);
}

/**
 * Return the reader's preferred language, or null when their first preference
 * is Chinese (no prompt) or unavailable.
 *
 * Unknown non-Chinese languages fall back to English rather than guessing a
 * model language name.
 */
export function detectTargetLanguage(): TargetLanguage | null {
	if (typeof navigator === 'undefined') return null;

	let preferred = '';
	try {
		const languages = navigator.languages;
		if (Array.isArray(languages) && languages.length > 0) preferred = languages[0] ?? '';
		else preferred = navigator.language ?? '';
	} catch {
		return null;
	}

	const tag = preferred.trim();
	if (!tag) return null;
	const primary = tag.toLowerCase().split('-')[0];
	if (!primary || CHINESE_PRIMARY.has(primary)) return null;

	const canonical = ALIASES[primary] ?? primary;
	const info = LANGUAGES[canonical];
	if (info) return makeTarget(canonical, info, tag);

	const fallback = LANGUAGES.en;
	if (!fallback) return null;
	return makeTarget('en', fallback, 'en');
}
