import type { Artist, Entry, Image, ReadingProgress } from "../../gallery/model";
import { bookId, LIBRARY_ID, seriesId } from "./identity";
import { type KomgaState, progressCounts } from "./state";
import type { BookDto, PageDto, ReadProgressDto, SeriesDto } from "./types";

export const bookDto = async (entry: Entry, state: KomgaState): Promise<BookDto> => {
	const artist = (await state.index()).series.get(seriesId(entry.artistId));
	if (!artist) {
		throw new Error(`Artist not found: ${entry.artistId}`);
	}
	const number = artist.entries.indexOf(entry) + 1;
	const pages = await entry.getImages();
	const sizeBytes = pages.reduce((total, image) => total + image.sizeBytes, 0);

	return {
		id: bookId(entry),
		seriesId: seriesId(entry.artistId),
		libraryId: LIBRARY_ID,
		name: entry.name,
		created: entry.createdAt,
		lastModified: entry.updatedAt,
		number,
		seriesTitle: artist.name,
		url: "",
		deleted: false,
		oneshot: false,
		fileHash: "",
		fileLastModified: entry.updatedAt,
		size: `${sizeBytes} B`,
		sizeBytes,
		media: {
			status: "READY",
			mediaType: "application/zip",
			mediaProfile: "DIVINA",
			comment: "",
			pagesCount: pages.length,
			epubDivinaCompatible: false,
			epubIsKepub: false,
		},
		metadata: bookMetadata(entry, number),
		readProgress: readProgressDto(state.progress.get(entry.id)),
	};
};

const bookMetadata = (entry: Entry, number: number): BookDto["metadata"] => ({
	title: entry.name,
	titleLock: false,
	summary: "",
	summaryLock: false,
	number: String(number),
	numberLock: false,
	numberSort: number,
	numberSortLock: false,
	authors: [],
	authorsLock: false,
	tags: [],
	tagsLock: false,
	links: [],
	linksLock: false,
	notableEntities: [],
	notableEntitiesLock: false,
	isbn: "",
	isbnLock: false,
	releaseDateLock: false,
	created: entry.createdAt,
	lastModified: entry.updatedAt,
});

export const seriesDto = (artist: Artist, state: KomgaState): SeriesDto => ({
	id: seriesId(artist.id),
	libraryId: LIBRARY_ID,
	name: artist.name,
	url: "",
	created: artist.createdAt,
	lastModified: artist.updatedAt,
	fileLastModified: artist.updatedAt,
	deleted: false,
	oneshot: false,
	...progressCounts(artist, state),
	metadata: seriesMetadata(artist),
	booksMetadata: {
		authors: [],
		tags: [],
		notableEntities: [],
		summary: "",
		summaryNumber: "",
		created: artist.createdAt,
		lastModified: artist.updatedAt,
	},
});

const seriesMetadata = (artist: Artist): SeriesDto["metadata"] => ({
	title: artist.name,
	titleSort: artist.name,
	summary: "",
	publisher: "",
	status: "ENDED",
	language: "",
	readingDirection: "LEFT_TO_RIGHT",
	genres: [],
	tags: [],
	sharingLabels: [],
	alternateTitles: [],
	links: [],
	totalBookCount: artist.entries.length,
	created: artist.createdAt,
	lastModified: artist.updatedAt,
	titleLock: false,
	titleSortLock: false,
	summaryLock: false,
	publisherLock: false,
	statusLock: false,
	languageLock: false,
	readingDirectionLock: false,
	genresLock: false,
	tagsLock: false,
	sharingLabelsLock: false,
	alternateTitlesLock: false,
	linksLock: false,
	totalBookCountLock: false,
	ageRatingLock: false,
});

export const pageDto = (image: Image, index: number): PageDto => ({
	fileName: image.name,
	number: index + 1,
	mediaType: image.contentType,
	size: `${image.sizeBytes} B`,
	sizeBytes: image.sizeBytes,
});

export const readProgressDto = (progress: ReadingProgress | undefined): ReadProgressDto | null => {
	if (!progress) {
		return null;
	}

	return {
		page: progress.page,
		completed: progress.completed,
		created: progress.createdAt,
		lastModified: progress.updatedAt,
		readDate: progress.updatedAt,
		deviceId: "",
		deviceName: "",
	};
};
