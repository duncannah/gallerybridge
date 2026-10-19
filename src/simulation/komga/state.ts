import type { Artist, Entry, GalleryApplication } from "../../gallery/model";
import { bookId, seriesId } from "./identity";

interface KomgaIndex {
	books: Map<string, Entry>;
	series: Map<string, Artist>;
}

export interface KomgaState extends GalleryApplication {
	index: () => Promise<KomgaIndex>;
}

export const createKomgaState = (application: GalleryApplication): KomgaState => {
	let index: Promise<KomgaIndex> | undefined;

	return {
		...application,
		index: (): Promise<KomgaIndex> => {
			index ??= application
				.catalog()
				.then((catalog) => {
					const entries = catalog.artists.flatMap((artist) => artist.entries);

					return {
						books: new Map(entries.map((entry) => [bookId(entry), entry])),
						series: new Map(catalog.artists.map((artist) => [seriesId(artist.id), artist])),
					};
				})
				.catch((error: unknown) => {
					index = undefined;
					throw error;
				});

			return index;
		},
	};
};

export const progressCounts = (
	artist: Artist,
	state: KomgaState,
): {
	booksCount: number;
	booksReadCount: number;
	booksUnreadCount: number;
	booksInProgressCount: number;
} => {
	let booksReadCount = 0;
	let booksInProgressCount = 0;
	for (const entry of artist.entries) {
		const progress = state.progress.get(entry.id);
		if (progress?.completed) {
			booksReadCount += 1;
		} else if (progress) {
			booksInProgressCount += 1;
		}
	}
	const booksCount = artist.entries.length;

	return {
		booksCount,
		booksReadCount,
		booksInProgressCount,
		booksUnreadCount: booksCount - booksReadCount - booksInProgressCount,
	};
};
