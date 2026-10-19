import { randomUUID } from "node:crypto";
import { inspect } from "node:util";
import type { Context, MiddlewareHandler, Next } from "hono";

const PRIVATE_FIELD = /password|secret|token|authorization|cookie|api[-_]?key/iu;
const TEXT_CONTENT = /json|text\//iu;

const debug = (event: string, details: object): void => {
	const output = inspect(details, {
		depth: null,
		maxArrayLength: null,
		maxStringLength: null,
		compact: false,
		colors: false,
	});

	console.log(`[${new Date().toISOString()}] ${event}\n${output}`);
};

const safeHeaders = (headers: Headers): Record<string, string> =>
	Object.fromEntries(
		Array.from(headers, ([name, value]) => {
			if (PRIVATE_FIELD.test(name)) {
				return [name, "[REDACTED]"];
			}

			return [name, value];
		}),
	);

const safeUrl = (url: string): string => {
	const result = new URL(url);
	for (const name of result.searchParams.keys()) {
		if (PRIVATE_FIELD.test(name)) {
			result.searchParams.set(name, "[REDACTED]");
		}
	}
	result.username = "";
	result.password = "";

	return result.toString();
};

const describeBody = async (message: Request | Response): Promise<unknown> => {
	if (!message.body) {
		return null;
	}
	const contentType = message.headers.get("content-type") ?? "";
	if (!TEXT_CONTENT.test(contentType)) {
		return "[Binary or streaming body omitted]";
	}
	try {
		const text = await message.clone().text();
		if (!contentType.includes("json")) {
			return text;
		}

		return JSON.parse(text, (key: string, value: unknown) => {
			if (PRIVATE_FIELD.test(key)) {
				return "[REDACTED]";
			}

			return value;
		});
	} catch (error) {
		return { message: "Unable to inspect body", error };
	}
};

export const requestDebug: MiddlewareHandler = async (c: Context, next: Next): Promise<void> => {
	const requestId = randomUUID();
	debug("http.request", {
		requestId,
		method: c.req.method,
		url: safeUrl(c.req.url),
		headers: safeHeaders(c.req.raw.headers),
		body: await describeBody(c.req.raw),
	});

	await next();

	debug("http.response", {
		requestId,
		method: c.req.method,
		url: safeUrl(c.req.url),
		status: c.res.status,
		headers: safeHeaders(c.res.headers),
		body: await describeBody(c.res),
		error: c.error,
	});
};
