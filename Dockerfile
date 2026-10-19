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

USER bun

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
