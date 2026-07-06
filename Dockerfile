# syntax=docker/dockerfile:1

# Production image for hapuk.io.
# The runtime stage uses the official Playwright image so headless Chromium (used for
# PDF export) and all its OS dependencies are present. Keep the Playwright image tag in
# sync with the `playwright` version in package.json.

# ---- deps: install node_modules ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: compile Next.js (standalone output) ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Env vars are validated at import time; provide a throwaway set for the build step.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-only-secret \
    BETTER_AUTH_URL=http://localhost:3000
RUN pnpm build

# ---- migrator: lightweight image to run Drizzle migrations ----
# Has drizzle-kit (a devDependency, present in the deps node_modules) plus the config,
# schema and generated SQL — everything `pnpm db:migrate` needs, without the heavy
# Playwright/Chromium runtime. Run as a one-shot before the app starts.
FROM node:22-bookworm-slim AS migrator
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src
CMD ["pnpm", "db:migrate"]

# ---- runner: Playwright image (bundles Chromium + deps) ----
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Next standalone server + static assets.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Playwright is external to the Next bundle — copy the package so the standalone
# server can require it. Browsers are already present in this base image.
COPY --from=build /app/node_modules/playwright ./node_modules/playwright
COPY --from=build /app/node_modules/playwright-core ./node_modules/playwright-core

EXPOSE 3000
# Runtime env (DATABASE_URL, BETTER_AUTH_*, AWS_*/S3_*, RESEND_API_KEY, APP_URL) must be
# supplied by the host. Run DB migrations (pnpm db:migrate) as a separate deploy step.
CMD ["node", "server.js"]
