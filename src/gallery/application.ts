import { createCatalog } from "./catalog";
import type { GalleryApplication } from "./model";

export const createGalleryApplication = (root: string): GalleryApplication => ({
	catalog: createCatalog(root),
	progress: new Map(),
});
