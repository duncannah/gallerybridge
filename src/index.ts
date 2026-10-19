import process from "node:process";
import { Hono } from "hono";

import { requestDebug } from "./debug";
import { createGalleryApplication } from "./gallery/application";
import { createKomgaApi } from "./simulation/komga/api";

const createApp = (searchPath = process.env.SEARCH_PATH ?? "."): Hono => {
	const application = createGalleryApplication(searchPath);
	const server = new Hono();
	server.use("*", requestDebug);
	server.get("/", (c) => c.text("GalleryBridge"));
	server.route("/api", createKomgaApi(application));

	return server;
};

const app = createApp();

export default {
	hostname: "0.0.0.0",
	fetch: app.fetch,
};
