// CJK-aware reading estimate, shared by the homepage cards and the article
// page. Chinese characters count individually (≈400 chars/min), Latin runs as
// words (≈200 wpm); both floor to at least one minute so very short notes
// don't read as "0 分钟".
export interface ReadingStats {
	/** Estimated word count: CJK characters + Latin words. */
	wordCount: number;
	/** Reading time in whole minutes (minimum 1). */
	minutes: number;
}

const CJK = /[一-龥]/g;

export function readingStats(body: string): ReadingStats {
	const cnChars = (body.match(CJK) ?? []).length;
	const enWords = (body.replace(CJK, ' ').match(/[A-Za-z0-9]+/g) ?? []).length;
	const wordCount = cnChars + enWords;
	const minutes = Math.max(1, Math.round(cnChars / 400 + enWords / 200));
	return { wordCount, minutes };
}
