import { createHash } from "node:crypto";

import type { Entry } from "../../gallery/model";

export const LIBRARY_ID = "gallerybridge";

const ID_LENGTH = 24;

const komgaId = (value: string): string =>
	createHash("sha256").update(value).digest("hex").slice(0, ID_LENGTH);

export const bookId = (entry: Entry): string => komgaId(`book:${entry.id}`);

export const seriesId = (artistId: string): string => komgaId(`series:${artistId}`);
