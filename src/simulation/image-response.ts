import process from "node:process";
import { file } from "bun";

import type { Image } from "../gallery/model";

const THUMBNAIL_BLUR_RADIUS = 30;

let sharpModule: Promise<typeof import("sharp")> | undefined;

// Only import sharp when needed
export const loadSharp = async (): Promise<(typeof import("sharp"))["default"]> => {
	sharpModule ??= import("sharp");
	const { default: sharp } = await sharpModule;

	return sharp;
};

export const createThumbnailResponse = async (image: Image): Promise<Response> => {
	const sharp = await loadSharp();
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

	return new Response(thumbnailImage, { headers: { "Content-Type": "image/jpeg" } });
};

export const createImageResponse = async (image: Image, thumbnail = false): Promise<Response> => {
	if (thumbnail && process.env.THUMBNAIL_BLUR_BACKGROUND !== "false") {
		return await createThumbnailResponse(image);
	}

	return new Response(file(image.path), { headers: { "Content-Type": image.contentType } });
};
