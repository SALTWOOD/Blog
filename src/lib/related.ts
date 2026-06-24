import similarities from '../data/similarities.json';

export interface RelatedPost {
	id: string;
	title: string;
	score: number;
}

const data = similarities as Record<string, RelatedPost[]>;

/**
 * Up to `n` related posts for the given collection id, looked up from the
 * precomputed TF-IDF similarity table (`src/data/similarities.json`). Returns
 * an empty array when the table is missing or empty for this post, so the
 * RelatedPosts block can hide itself gracefully.
 */
export function getRelated(id: string, n = 4): RelatedPost[] {
	return (data[id] ?? []).slice(0, n);
}
