export interface Image {
	path: string;
	name: string;
	contentType: string;
	sizeBytes: number;
}

export interface Entry {
	id: string;
	artistId: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	getImages: () => Promise<Image[]>;
}

export interface Artist {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	entries: Entry[];
}

export interface Catalog {
	root: string;
	artists: Artist[];
}

export interface ReadingProgress {
	page: number;
	completed: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface GalleryApplication {
	catalog: () => Promise<Catalog>;
	progress: Map<string, ReadingProgress>;
}
