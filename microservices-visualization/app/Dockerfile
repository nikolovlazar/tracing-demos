# Build stage
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY . /app/

ARG API_URL
ENV API_URL=$API_URL

ARG SENTRY_DSN
ENV SENTRY_DSN=$SENTRY_DSN

ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

ARG SENTRY_AUTH_TOKEN

RUN npm install --frozen-lockfile
RUN SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN} npm run build

# Production stage
FROM node:22-slim AS runner
WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/.output ./

EXPOSE 3000
CMD ["node", "server/index.mjs"]