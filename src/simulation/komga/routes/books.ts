import { Hono } from "hono";

import type { ReadingProgress } from "../../../gallery/model";
import { bookDto, pageDto, readProgressDto } from "../responses";
import type { KomgaState } from "../state";
import { findBook, imageResponse, jsonBody, listBooks, page, StatusCodes } from "./shared";

interface ProgressUpdate {
	page?: number;
	completed?: boolean;
}

const hasValidProgressUpdate = (body: ProgressUpdate, pageCount: number): boolean => {
	const hasValidPage =
		body.page === undefined ||
		(Number.isInteger(body.page) && body.page >= 1 && body.page <= pageCount);
	const hasValidCompleted = body.completed === undefined || typeof body.completed === "boolean";
	const hasUpdate = body.page !== undefined || body.completed !== undefined;

	return hasValidPage && hasValidCompleted && hasUpdate;
};

const updatedProgress = (
	body: ProgressUpdate,
	pageCount: number,
	previous: ReadingProgress | undefined,
): ReadingProgress => {
	let currentPage = body.page ?? previous?.page ?? 1;
	if (body.completed === true) {
		currentPage = pageCount;
	}

	const now = new Date().toISOString();

	return {
		page: currentPage,
		completed: body.completed ?? currentPage === pageCount,
		createdAt: previous?.createdAt ?? now,
		updatedAt: now,
	};
};

const progressRoutes = (state: KomgaState): Hono => {
	const app = new Hono();
	app.get("/:bookId/read-progress", async (c) => {
		const entry = await findBook(state, c.req.param("bookId"));
		const progress = state.progress.get(entry.id);

		if (progress) {
			return c.json(readProgressDto(progress));
		}

		return c.body(null, StatusCodes.noContent);
	});

	app.patch("/:bookId/read-progress", async (c) => {
		const entry = await findBook(state, c.req.param("bookId"));
		const body = await jsonBody<ProgressUpdate>(c);
		const pages = await entry.getImages();

		if (!hasValidProgressUpdate(body, pages.length)) {
			return c.json({ message: "Invalid read progress" }, StatusCodes.badRequest);
		}

		const previous = state.progress.get(entry.id);
		state.progress.set(entry.id, updatedProgress(body, pages.length, previous));

		return c.body(null, StatusCodes.noContent);
	});

	app.delete("/:bookId/read-progress", async (c) => {
		const entry = await findBook(state, c.req.param("bookId"));
		state.progress.delete(entry.id);

		return c.body(null, StatusCodes.noContent);
	});

	return app;
};

export const bookRoutes = (state: KomgaState): Hono => {
	const app = new Hono();

	app.post("/list", async (c) => {
		const books = await listBooks(c, state);
		const result = page(c, books);
		const content = await Promise.all(result.content.map((entry) => bookDto(entry, state)));

		return c.json({ ...result, content });
	});

	app.get("/ondeck", (c) => c.json(page(c, [])));

	app.get("/:bookId", async (c) => {
		const entry = await findBook(state, c.req.param("bookId"));

		return c.json(await bookDto(entry, state));
	});

	app.get("/:bookId/thumbnail", async (c) => {
		const entry = await findBook(state, c.req.param("bookId"));
		const pages = await entry.getImages();

		return imageResponse(pages[0], true);
	});

	app.get("/:bookId/pages", async (c) => {
		const entry = await findBook(state, c.req.param("bookId"));
		const pages = await entry.getImages();

		return c.json(pages.map(pageDto));
	});

	app.get("/:bookId/pages/:pageNumber", async (c) => {
		const entry = await findBook(state, c.req.param("bookId"));
		const pages = await entry.getImages();
		const pageNumber = Number(c.req.param("pageNumber"));

		return imageResponse(pages[pageNumber - 1]);
	});

	app.route("/", progressRoutes(state));

	return app;
};
