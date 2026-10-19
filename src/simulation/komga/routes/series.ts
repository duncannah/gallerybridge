import { Hono } from "hono";

import { bookDto, seriesDto } from "../responses";
import type { KomgaState } from "../state";
import {
	findSeries,
	imageResponse,
	jsonBody,
	listBooks,
	listSeries,
	page,
	StatusCodes,
} from "./shared";

export const seriesRoutes = (state: KomgaState): Hono => {
	const app = new Hono();

	app.post("/list", async (c) => {
		const artists = await listSeries(c, state);
		const result = page(c, artists);
		const content = result.content.map((artist) => seriesDto(artist, state));

		return c.json({ ...result, content });
	});

	for (const route of ["new", "updated"]) {
		app.get(`/${route}`, async (c) => {
			const artists = await listSeries(c, state);
			let key: "createdAt" | "updatedAt" = "updatedAt";
			if (route === "new") {
				key = "createdAt";
			}
			artists.sort((first, second) => second[key].localeCompare(first[key]));
			const result = page(c, artists);
			const content = result.content.map((artist) => seriesDto(artist, state));

			return c.json({ ...result, content });
		});
	}

	app.get("/release-dates", (c) => c.json([]));

	app.get("/:seriesId", async (c) => {
		const artist = await findSeries(state, c.req.param("seriesId"));

		return c.json(seriesDto(artist, state));
	});

	app.get("/:seriesId/thumbnail", async (c) => {
		const artist = await findSeries(state, c.req.param("seriesId"));
		const [entry] = artist.entries;
		if (!entry) {
			return imageResponse(undefined);
		}
		const images = await entry.getImages();

		return imageResponse(images[0], true);
	});

	app.get("/:seriesId/books", async (c) => {
		const artist = await findSeries(state, c.req.param("seriesId"));
		const entries = await listBooks(c, state, artist);
		const result = page(c, entries);
		const content = await Promise.all(result.content.map((entry) => bookDto(entry, state)));

		return c.json({ ...result, content });
	});

	return app;
};

export const tachiyomiRoutes = (state: KomgaState): Hono => {
	const app = new Hono();

	app.get("/:seriesId/read-progress/tachiyomi", async (c) => {
		const artist = await findSeries(state, c.req.param("seriesId"));
		const series = seriesDto(artist, state);
		let lastReadContinuousIndex = -1;
		for (const entry of artist.entries) {
			if (!state.progress.get(entry.id)?.completed) {
				break;
			}
			lastReadContinuousIndex += 1;
		}

		return c.json({
			booksCount: series.booksCount,
			booksReadCount: series.booksReadCount,
			booksUnreadCount: series.booksUnreadCount,
			booksInProgressCount: series.booksInProgressCount,
			lastReadContinuousIndex,
		});
	});

	app.put("/:seriesId/read-progress/tachiyomi", async (c) => {
		const artist = await findSeries(state, c.req.param("seriesId"));
		const { lastBookRead } = await jsonBody<{ lastBookRead: number }>(c);
		if (
			!Number.isInteger(lastBookRead) ||
			lastBookRead < -1 ||
			lastBookRead >= artist.entries.length
		) {
			return c.json({ message: "Invalid book index" }, StatusCodes.badRequest);
		}
		await Promise.all(
			artist.entries.map(async (entry, index) => {
				if (index > lastBookRead) {
					state.progress.delete(entry.id);

					return;
				}
				const images = await entry.getImages();
				const now = new Date().toISOString();
				state.progress.set(entry.id, {
					page: images.length,
					completed: true,
					createdAt: state.progress.get(entry.id)?.createdAt ?? now,
					updatedAt: now,
				});
			}),
		);

		return c.body(null, StatusCodes.noContent);
	});

	return app;
};
