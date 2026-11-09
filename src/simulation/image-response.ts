import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { file } from "bun";

import type { Image } from "../gallery/model";

const THUMBNAIL_BLUR_RADIUS = 30;
const THUMBNAIL_CACHE_VERSION = 1;
const thumbnailCacheDirectory: string =
	process.env.THUMBNAIL_CACHE_PATH ?? join(tmpdir(), "gallerybridge", "thumbnails");

let sharpModule: Promise<typeof import("sharp")> | undefined;

// Only import sharp when needed
export const loadSharp = async (): Promise<typeof import("sharp")["default"]> => {
	sharpModule ??= import("sharp");
	const { default: sharp } = await sharpModule;

	return sharp;
};

const thumbnailCachePath = (imagePath: string): string => {
	const imageHash = createHash("sha256").update(imagePath).digest("hex");

	return join(thumbnailCacheDirectory, `${THUMBNAIL_CACHE_VERSION}-${imageHash}.jpg`);
};

const readCachedThumbnail = async (
	cachePath: string,
	sourceModifiedAt: Date,
): Promise<Buffer | undefined> => {
	try {
		const cachedThumbnail = await readFile(cachePath);
		const cacheInfo = await stat(cachePath);

		if (cacheInfo.mtime.getTime() !== sourceModifiedAt.getTime()) {
			return undefined;
		}

		return cachedThumbnail;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return undefined;
		}

		throw error;
	}
};

const writeCachedThumbnail = async (
	cachePath: string,
	thumbnail: Buffer,
	sourceModifiedAt: Date,
): Promise<void> => {
	await mkdir(thumbnailCacheDirectory, { recursive: true });
	const temporaryPath = `${cachePath}.${randomUUID()}.tmp`;

	try {
		await writeFile(temporaryPath, thumbnail);
		await utimes(temporaryPath, sourceModifiedAt, sourceModifiedAt);
		await rename(temporaryPath, cachePath);
	} finally {
		await rm(temporaryPath, { force: true });
	}
};

export const createThumbnailResponse = async (image: Image): Promise<Response> => {
	const sharp = await loadSharp();
	const sourceInfo = await stat(image.path);
	const cachePath = thumbnailCachePath(image.path);
	const cachedThumbnail = await readCachedThumbnail(cachePath, sourceInfo.mtime);

	if (cachedThumbnail) {
		return new Response(new Uint8Array(cachedThumbnail), {
			headers: { "Content-Type": "image/jpeg" },
		});
	}

	const width = 600;
	const height = 900;
	const source = sharp(image.path).rotate();

	const background = await source
		.clone()
		.resize(width, height, { fit: "cover" })
		.blur(THUMBNAIL_BLUR_RADIUS)
		.jpeg({ quality: 85 })
		.toBuffer();

	const cover = await source
		.clone()
		.resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.png()
		.toBuffer();

	const thumbnailImage = await sharp(background)
		.composite([{ input: cover, gravity: "centre" }])
		.jpeg({ quality: 90 })
		.toBuffer();

	await writeCachedThumbnail(cachePath, thumbnailImage, sourceInfo.mtime);

	return new Response(thumbnailImage, { headers: { "Content-Type": "image/jpeg" } });
};

export const createImageResponse = async (image: Image, thumbnail = false): Promise<Response> => {
	if (thumbnail && process.env.THUMBNAIL_BLUR_BACKGROUND !== "false") {
		return await createThumbnailResponse(image);
	}

	return new Response(file(image.path), { headers: { "Content-Type": image.contentType } });
};
