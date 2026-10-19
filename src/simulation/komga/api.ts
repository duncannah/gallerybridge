import { Hono } from "hono";

import type { GalleryApplication } from "../../gallery/model";
import { bookRoutes } from "./routes/books";
import { metadataRoutes } from "./routes/metadata";
import { seriesRoutes, tachiyomiRoutes } from "./routes/series";
import { createKomgaState } from "./state";

export const createKomgaApi = (application: GalleryApplication): Hono => {
	const state = createKomgaState(application);
	const api = new Hono();

	api.route("/v1/books", bookRoutes(state));
	api.route("/v1/series", seriesRoutes(state));
	api.route("/v2/series", tachiyomiRoutes(state));
	api.route("/", metadataRoutes(state));

	return api;
};
