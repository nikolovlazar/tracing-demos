FROM oven/bun:1.2.3 AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates

COPY package.json .
COPY bun.lock .
RUN bun install

COPY . .

ARG SENTRY_AUTH_TOKEN
RUN SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN} bun run build

FROM oven/bun:1.2.3

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle /app/drizzle
COPY --from=builder /app/drizzle.config.ts /app/drizzle.config.ts

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["bun", "dist/index.js"]