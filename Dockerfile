FROM oven/bun:1.4.2-alpine AS dependencies

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.4.2-alpine

WORKDIR /app

COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json ./package.json
COPY --chown=bun:bun src ./src

ENV NODE_ENV=production
ENV SEARCH_PATH=/library
ENV THUMBNAIL_CACHE_PATH=/cache/thumbnails

RUN mkdir -p /cache && chown bun:bun /cache
VOLUME ["/cache"]

USER bun

EXPOSE 3000

HEALTHCHECK \
	--interval=1m \
	--timeout=5s \
	--start-period=1m \
	--start-interval=5s \
	--retries=3 \
	CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/"]

CMD ["bun", "run", "src/index.ts"]
