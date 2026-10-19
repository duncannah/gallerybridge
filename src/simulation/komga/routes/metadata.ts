import { Hono } from "hono";

import { LIBRARY_ID } from "../identity";
import type { KomgaState } from "../state";
import { StatusCodes } from "./shared";

const BASIC_AUTH = /^Basic\s+(?<credentials>\S+)$/iu;

const basicUsername = (authorization: string): string | null => {
	const credentials = BASIC_AUTH.exec(authorization)?.groups?.credentials;
	if (!credentials) {
		return null;
	}

	try {
		const decoded = Buffer.from(atob(credentials), "latin1").toString("utf8");
		const separator = decoded.indexOf(":");
		if (separator < 1) {
			return null;
		}

		return decoded.slice(0, separator);
	} catch {
		return null;
	}
};

export const metadataRoutes = (state: KomgaState): Hono => {
	const app = new Hono();

	app.get("/v2/users/me", (c) => {
		// Aidoku expects this check lol
		const username = basicUsername(c.req.header("Authorization") ?? "");
		if (!username) {
			c.header("WWW-Authenticate", 'Basic realm="GalleryBridge"');

			return c.json({ error: "Unauthorized" }, StatusCodes.unauthorized);
		}

		return c.json({
			id: username,
			email: username,
			roles: ["USER", "PAGE_STREAMING"],
			sharedAllLibraries: true,
			sharedLibrariesIds: [],
			labelsAllow: [],
			labelsExclude: [],
			ageRestriction: null,
		});
	});

	app.get("/v1/libraries", async (c) => {
		const catalog = await state.catalog();

		return c.json([
			{ id: LIBRARY_ID, name: "GalleryBridge", root: catalog.root, unavailable: false },
		]);
	});

	app.get("/v1/publishers", (c) => c.json([]));

	for (const route of ["genres", "tags", "languages", "age-ratings", "sharing-labels"]) {
		app.get(`/v1/${route}`, (c) => c.json([]));
	}

	app.get("/v2/authors", (c) => c.json([]));

	return app;
};
