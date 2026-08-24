# NordPrint commerce backend (Medusa v2).
#
# Det samme image kører som medusa-server og som medusa-worker; forskellen er
# MEDUSA_WORKER_MODE. Det holder de to processer bit-for-bit identiske, så en
# fejl aldrig kan skyldes, at de kører forskellig kode.

# ---------------------------------------------------------------- base
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------- dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/commerce/package.json apps/commerce/
COPY apps/storefront/package.json apps/storefront/
COPY packages/commerce/package.json packages/commerce/
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter @nordprint/commerce-backend...

# ---------------------------------------------------------------- build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY . .

ENV NODE_ENV=production

RUN pnpm --filter "./packages/*" --sequential build && \
    pnpm --filter @nordprint/commerce-backend build

# -------------------------------------------------------------- runtime
FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nordprint && \
    adduser --system --uid 1001 --ingroup nordprint nordprint

# `medusa build` lægger den kørbare server i .medusa/server, komplet med sin
# egen package.json. Vi installerer dens produktionsafhængigheder der.
COPY --from=build --chown=nordprint:nordprint /app/apps/commerce/.medusa/server ./
COPY --from=build --chown=nordprint:nordprint /app/packages ./packages

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --prod --ignore-scripts

# Uploads i udvikling ryger her; i produktion går de til S3/R2, og mappen
# står tom. Den oprettes alligevel, så et forkert konfigureret miljø fejler
# med en tydelig besked frem for EACCES.
RUN mkdir -p static && chown nordprint:nordprint static

USER nordprint
EXPOSE 9000

STOPSIGNAL SIGTERM

# Migrationer køres af deploy-scriptet, ikke ved opstart: to containere, der
# starter samtidigt, ville ellers migrere oven i hinanden.
CMD ["sh", "-c", "npx medusa start"]
