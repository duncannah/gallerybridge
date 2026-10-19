// biome-ignore-all lint/style/noExcessiveLinesPerFile: Keep shared route helpers together.

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import type { Artist, Entry, Image } from "../../../gallery/model";
import { createImageResponse } from "../../image-response";
import { LIBRARY_ID, seriesId } from "../identity";
import { type KomgaState, progressCounts } from "../state";

export const StatusCodes = {
	noContent: 204,
	badRequest: 400,
	unauthorized: 401,
	notFound: 404,
} as const;

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT = "metadata.title,asc";

interface Page<T> {
	content: T[];
	totalElements: number;
	totalPages: number;
	number: number;
	size: number;
	numberOfElements: number;
	first: boolean;
	last: boolean;
	empty: boolean;
	sort: { sorted: boolean; unsorted: boolean; empty: boolean };
}

export const findBook = async (state: KomgaState, bookId: string): Promise<Entry> => {
	const index = await state.index();
	const entry = index.books.get(bookId);
	if (!entry) {
		throw new HTTPException(StatusCodes.notFound, { message: "Book not found" });
	}

	return entry;
};

export const findSeries = async (state: KomgaState, id: string): Promise<Artist> => {
	const index = await state.index();
	const artist = index.series.get(id);
	if (!artist) {
		throw new HTTPException(StatusCodes.notFound, { message: "Series not found" });
	}

	return artist;
};

export const page = <T>(c: Context, values: T[]): Page<T> => {
	const pageNumber = Number(c.req.query("page") ?? 0);
	const pageSize = Number(c.req.query("size") ?? DEFAULT_PAGE_SIZE);
	if (
		!Number.isInteger(pageNumber) ||
		pageNumber < 0 ||
		!Number.isInteger(pageSize) ||
		pageSize < 1
	) {
		throw new HTTPException(StatusCodes.badRequest, { message: "Invalid pagination" });
	}

	const isUnpaged = c.req.query("unpaged") === "true";
	let content = values.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);
	let number = pageNumber;
	let size = pageSize;
	let totalPages = Math.ceil(values.length / pageSize);

	if (isUnpaged) {
		content = values;
		number = 0;
		size = values.length;
		totalPages = 1;
	}

	return {
		content,
		totalElements: values.length,
		totalPages,
		number,
		size,
		numberOfElements: content.length,
		first: number === 0,
		last: number + 1 >= totalPages,
		empty: content.length === 0,
		sort: { sorted: true, unsorted: false, empty: false },
	};
};

export const imageResponse = (image: Image | undefined, thumbnail = false): Promise<Response> => {
	if (!image) {
		throw new HTTPException(StatusCodes.notFound, { message: "Page not found" });
	}

	return createImageResponse(image, thumbnail);
};

export const jsonBody = async <T extends object>(c: Context): Promise<T> => {
	try {
		const body = await c.req.json<T>();
		if (!body || typeof body !== "object" || Array.isArray(body)) {
			throw new Error("Invalid body");
		}

		return body;
	} catch (error) {
		throw new HTTPException(StatusCodes.badRequest, {
			message: "Expected a JSON object",
			cause: error,
		});
	}
};

interface SearchOperator {
	operator: string;
	value: string;
}

interface Condition {
	allOf?: Condition[];
	deleted?: { operator: "isTrue" | "isFalse" };
	anyOf?: Condition[];
	libraryId?: SearchOperator;
	seriesId?: SearchOperator;
	title?: SearchOperator;
	publisher?: SearchOperator;
	readStatus?: SearchOperator;
}

const matchesValue = (actual: string, filter: SearchOperator | undefined): boolean => {
	if (!filter) {
		return true;
	}
	const { operator, value } = filter;
	const text = actual.toLowerCase();
	const normalizedValue = value.toLowerCase();
	switch (operator) {
		case "is":
			return actual === value;
		case "isNot":
			return actual !== value;
		case "contains":
			return text.includes(normalizedValue);
		case "doesNotContain":
			return !text.includes(normalizedValue);
		case "beginsWith":
			return text.startsWith(normalizedValue);
		case "doesNotBeginWith":
			return !text.startsWith(normalizedValue);
		case "endsWith":
			return text.endsWith(normalizedValue);
		// biome-ignore lint/security/noSecrets: Komga API operator name.
		case "doesNotEndWith":
			return !text.endsWith(normalizedValue);
		default:
			throw new HTTPException(StatusCodes.badRequest, {
				message: `Unsupported search operator: ${operator}`,
			});
	}
};

const readStatus = (item: Artist | Entry, state: KomgaState): string => {
	if ("entries" in item) {
		const counts = progressCounts(item, state);
		if (counts.booksCount > 0 && counts.booksReadCount === counts.booksCount) {
			return "READ";
		}
		if (counts.booksReadCount > 0 || counts.booksInProgressCount > 0) {
			return "IN_PROGRESS";
		}

		return "UNREAD";
	}
	const progress = state.progress.get(item.id);
	if (progress?.completed) {
		return "READ";
	}
	if (progress) {
		return "IN_PROGRESS";
	}

	return "UNREAD";
};

const itemSeriesId = (item: Artist | Entry): string => {
	if ("entries" in item) {
		return seriesId(item.id);
	}

	return seriesId(item.artistId);
};

const matchesCondition = (
	item: Artist | Entry,
	condition: Condition,
	state: KomgaState,
): boolean => {
	if (condition.allOf) {
		return condition.allOf.every((child) => matchesCondition(item, child, state));
	}
	if (condition.anyOf) {
		return condition.anyOf.some((child) => matchesCondition(item, child, state));
	}
	if (condition.deleted?.operator === "isTrue") {
		return false;
	}

	return (
		matchesValue(LIBRARY_ID, condition.libraryId) &&
		matchesValue(itemSeriesId(item), condition.seriesId) &&
		matchesValue(item.name, condition.title) &&
		matchesValue("", condition.publisher) &&
		matchesValue(readStatus(item, state), condition.readStatus)
	);
};

interface SearchOptions {
	fullTextSearch?: string;
	searchTerm?: string;
	libraryIds?: string[];
	seriesIds?: string[];
	condition?: Condition;
}

const readSearchOptions = (c: Context): Promise<SearchOptions> => {
	if (c.req.method !== "POST") {
		return Promise.resolve({});
	}

	return jsonBody<SearchOptions>(c);
};

const matchesSearchOptions = <T extends Artist | Entry>(
	item: T,
	options: SearchOptions,
	searchTerm: string,
	state: KomgaState,
): boolean => {
	if (!item.name.toLowerCase().includes(searchTerm)) {
		return false;
	}
	if (Array.isArray(options.libraryIds) && !options.libraryIds.includes(LIBRARY_ID)) {
		return false;
	}
	if (Array.isArray(options.seriesIds) && !options.seriesIds.includes(itemSeriesId(item))) {
		return false;
	}

	return !options.condition || matchesCondition(item, options.condition, state);
};

const sortItems = <T extends Artist | Entry>(items: T[], sort: string): T[] => {
	items.sort((first, second) => {
		if (sort.startsWith("created")) {
			return first.createdAt.localeCompare(second.createdAt);
		}
		if (sort.startsWith("lastModified")) {
			return first.updatedAt.localeCompare(second.updatedAt);
		}

		return first.name.localeCompare(second.name, "en", { numeric: true });
	});

	if (sort.endsWith(",desc")) {
		items.reverse();
	}

	return items;
};

const search = async <T extends Artist | Entry>(
	c: Context,
	state: KomgaState,
	items: T[],
): Promise<T[]> => {
	const options = await readSearchOptions(c);
	const searchTerm = String(
		options.fullTextSearch ?? options.searchTerm ?? c.req.query("search") ?? "",
	).toLowerCase();
	options.libraryIds ??= c.req.queries("library_id");
	options.seriesIds ??= c.req.queries("series_id");
	const matches = items.filter((item) => matchesSearchOptions(item, options, searchTerm, state));

	return sortItems(matches, c.req.query("sort") ?? DEFAULT_SORT);
};

export const listBooks = async (
	c: Context,
	state: KomgaState,
	artist?: Artist,
): Promise<Entry[]> => {
	if (artist) {
		return search(c, state, artist.entries);
	}
	const catalog = await state.catalog();

	return search(
		c,
		state,
		catalog.artists.flatMap((item) => item.entries),
	);
};

export const listSeries = async (c: Context, state: KomgaState): Promise<Artist[]> => {
	const catalog = await state.catalog();

	return search(c, state, catalog.artists);
};
