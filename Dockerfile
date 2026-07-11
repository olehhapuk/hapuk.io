# syntax=docker/dockerfile:1

# Production image for hapuk.io.
# The runtime stage uses the official Playwright image so headless Chromium (used for
# PDF export) and all its OS dependencies are present. Keep the Playwright image tag in
# sync with the `playwright` version in package.json.

# ---- deps: install node_modules ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
# pnpm-workspace.yaml carries the build-script approvals (onlyBuiltDependencies /
# ignoredBuiltDependencies). Without it, pnpm treats esbuild/sharp/unrs-resolver as
# unapproved and fails a fresh --frozen-lockfile install with ERR_PNPM_IGNORED_BUILDS.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
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

# Playwright lives in pnpm's symlinked store (node_modules/playwright is a symlink and
# playwright-core is a non-hoisted transitive dep), so it can't be COPYied by top-level
# path. Flatten both runtime packages into real directories (cp -L dereferences the
# symlinks) so the runner can copy them; there require('playwright') resolves
# 'playwright-core' as a sibling in node_modules.
RUN mkdir -p /pw \
 && cp -rL node_modules/playwright /pw/playwright \
 && cp -rL node_modules/.pnpm/playwright-core@*/node_modules/playwright-core /pw/playwright-core

# ---- migrator: lightweight image to run Drizzle migrations ----
# Has drizzle-kit (a devDependency, present in the deps node_modules) plus the config,
# schema and generated SQL — everything `pnpm db:migrate` needs, without the heavy
# Playwright/Chromium runtime. Run as a one-shot before the app starts.
FROM node:22-bookworm-slim AS migrator
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml drizzle.config.ts ./
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

# Playwright is external to the Next bundle. Next's standalone trace ships an INCOMPLETE
# playwright (a node_modules/playwright symlink into .pnpm, missing runtime data files
# like browsers.json). Drop that partial copy and lay down the complete flattened
# packages (prepared in the build stage) as real top-level dirs, so require('playwright')
# resolves 'playwright-core' as a sibling. Browsers are already present in this base image.
RUN rm -rf node_modules/playwright node_modules/playwright-core \
    node_modules/.pnpm/playwright@* node_modules/.pnpm/playwright-core@*
COPY --from=build /pw/playwright ./node_modules/playwright
COPY --from=build /pw/playwright-core ./node_modules/playwright-core

EXPOSE 3000
# Runtime env (DATABASE_URL, BETTER_AUTH_*, AWS_*/S3_*, RESEND_API_KEY, APP_URL) must be
# supplied by the host. Run DB migrations (pnpm db:migrate) as a separate deploy step.
CMD ["node", "server.js"]
