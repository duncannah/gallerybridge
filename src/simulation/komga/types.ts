export interface PageDto {
	fileName: string;
	number: number;
	mediaType: string;
	size: string;
	sizeBytes?: number;
	width?: number;
	height?: number;
}

export interface BookDto {
	created: string;
	deleted: boolean;
	fileHash: string;
	fileLastModified: string;
	id: string;
	lastModified: string;
	libraryId: string;
	media: MediaDto;
	metadata: BookMetadataDto;
	name: string;
	number: number;
	oneshot: boolean;
	readProgress?: ReadProgressDto | null;
	seriesId: string;
	seriesTitle: string;
	size: string;
	sizeBytes: number;
	url: string;
}

export interface SeriesDto {
	booksCount: number;
	booksInProgressCount: number;
	booksMetadata: BookMetadataAggregationDto;
	booksReadCount: number;
	booksUnreadCount: number;
	created: string;
	deleted: boolean;
	fileLastModified: string;
	id: string;
	lastModified: string;
	libraryId: string;
	metadata: SeriesMetadataDto;
	name: string;
	oneshot: boolean;
	url: string;
}

export interface MediaDto {
	comment: string;
	epubDivinaCompatible: boolean;
	epubIsKepub: boolean;
	mediaProfile: string;
	mediaType: string;
	pagesCount: number;
	status: string;
}

export interface BookMetadataDto {
	authors: AuthorDto[];
	authorsLock: boolean;
	created: string;
	isbn: string;
	isbnLock: boolean;
	lastModified: string;
	links: WebLinkDto[];
	linksLock: boolean;
	notableEntities: NotableEntityDto[];
	notableEntitiesLock: boolean;
	number: string;
	numberLock: boolean;
	numberSort: number;
	numberSortLock: boolean;
	releaseDate?: string;
	releaseDateLock: boolean;
	summary: string;
	summaryLock: boolean;
	tags: string[];
	tagsLock: boolean;
	title: string;
	titleLock: boolean;
}

export interface ReadProgressDto {
	completed: boolean;
	created: string;
	deviceId: string;
	deviceName: string;
	lastModified: string;
	page: number;
	readDate: string;
}

export interface BookMetadataAggregationDto {
	authors: AuthorDto[];
	created: string;
	lastModified: string;
	notableEntities: NotableEntityDto[];
	releaseDate?: string;
	summary: string;
	summaryNumber: string;
	tags: string[];
}

export interface SeriesMetadataDto {
	ageRating?: number;
	ageRatingLock: boolean;
	alternateTitles: AlternateTitleDto[];
	alternateTitlesLock: boolean;
	created: string;
	genres: string[];
	genresLock: boolean;
	language: string;
	languageLock: boolean;
	lastModified: string;
	links: WebLinkDto[];
	linksLock: boolean;
	publisher: string;
	publisherLock: boolean;
	readingDirection: string;
	readingDirectionLock: boolean;
	sharingLabels: string[];
	sharingLabelsLock: boolean;
	status: string;
	statusLock: boolean;
	summary: string;
	summaryLock: boolean;
	tags: string[];
	tagsLock: boolean;
	title: string;
	titleLock: boolean;
	titleSort: string;
	titleSortLock: boolean;
	totalBookCount?: number;
	totalBookCountLock: boolean;
}

export interface AuthorDto {
	name: string;
	role: string;
}

export interface WebLinkDto {
	label: string;
	url: string;
}

export interface NotableEntityDto {
	kind: string;
	name: string;
}

export interface AlternateTitleDto {
	label: string;
	title: string;
}
