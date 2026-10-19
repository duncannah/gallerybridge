import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { Artist, Catalog, Entry, Image } from "./model";

interface Directory {
	name: string;
	path: string;
}

const IMAGE_EXTENSION = /\.(?:jpe?g|png)$/iu;
const PNG_EXTENSION = /\.png$/iu;

const inferContextType = (fileName: string): string => {
	if (PNG_EXTENSION.test(fileName)) {
		return "image/png";
	}

	return "image/jpeg";
};

const directoriesIn = async (directory: string): Promise<Directory[]> => {
	const entries = await readdir(directory, { withFileTypes: true });

	return entries
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
		.map((entry) => ({ name: entry.name, path: join(directory, entry.name) }))
		.sort((first, second) => first.name.localeCompare(second.name, "en", { numeric: true }));
};

const readImages = async (directory: string): Promise<Image[]> => {
	const entries = await readdir(directory, { withFileTypes: true });
	const images = entries
		.filter((entry) => entry.isFile() && IMAGE_EXTENSION.test(entry.name))
		.sort((first, second) => first.name.localeCompare(second.name, "en", { numeric: true }));

	return Promise.all(
		images.map(async (image) => {
			const path = join(directory, image.name);
			const { size } = await stat(path);
			const contentType = inferContextType(image.name);

			return {
				path,
				name: image.name,
				contentType,
				sizeBytes: size,
			};
		}),
	);
};

const createEntry = async (artist: Directory, entry: Directory): Promise<Entry> => {
	const info = await stat(entry.path);
	const key = `${artist.name}/${entry.name}`;
	let images: Promise<Image[]> | undefined;

	return {
		id: key,
		name: entry.name,
		artistId: artist.name,
		createdAt: info.birthtime.toISOString(),
		updatedAt: info.mtime.toISOString(),
		getImages: (): Promise<Image[]> => {
			images ??= readImages(entry.path).catch((error: unknown) => {
				images = undefined;
				throw error;
			});

			return images;
		},
	};
};

const createArtist = async (directory: Directory): Promise<Artist> => {
	const info = await stat(directory.path);
	const directories = await directoriesIn(directory.path);
	const entries = await Promise.all(directories.map((entry) => createEntry(directory, entry)));
	const updatedAt = entries.reduce((latest, entry) => {
		if (entry.updatedAt > latest) {
			return entry.updatedAt;
		}

		return latest;
	}, info.mtime.toISOString());

	return {
		id: directory.name,
		name: directory.name,
		createdAt: info.birthtime.toISOString(),
		updatedAt,
		entries,
	};
};

const scanCatalog = async (root: string): Promise<Catalog> => {
	const directories = await directoriesIn(resolve(root));
	const artists = await Promise.all(directories.map(createArtist));

	return { root: resolve(root), artists };
};

export const createCatalog = (root: string): (() => Promise<Catalog>) => {
	let catalog: Promise<Catalog> | undefined;

	return () => {
		catalog ??= scanCatalog(root).catch((error: unknown) => {
			catalog = undefined;
			throw error;
		});

		return catalog;
	};
};
