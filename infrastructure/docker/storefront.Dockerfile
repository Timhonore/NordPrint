# NordPrint storefront.
#
# Multi-stage: byggeren har hele monorepoet og pnpm; runtime-imaget har kun
# Next.js' standalone-output. Det holder imaget lille og betyder, at der ikke
# ligger kildekode, build-værktøj eller devDependencies på produktionsserveren.

# ---------------------------------------------------------------- base
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------- dependencies
FROM base AS deps

# Kun manifesterne først: så genbruges dette lag, indtil afhængighederne
# rent faktisk ændrer sig, og et almindeligt kodeændringsbuild springer
# hele installationen over.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/storefront/package.json apps/storefront/
COPY apps/commerce/package.json apps/commerce/
COPY packages/commerce/package.json packages/commerce/
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter @nordprint/storefront...

# ---------------------------------------------------------------- build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY . .

# NEXT_PUBLIC_* bages ind i klient-bundtet på byggetidspunktet — de kan ikke
# sættes senere i runtime.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_ALLOW_INDEXING=true
ARG NEXT_PUBLIC_IMAGE_HOSTNAME

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_ALLOW_INDEXING=$NEXT_PUBLIC_ALLOW_INDEXING \
    NEXT_PUBLIC_IMAGE_HOSTNAME=$NEXT_PUBLIC_IMAGE_HOSTNAME \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# De delte pakker skal bygges før storefront'en kan typechecke mod dem.
RUN pnpm --filter "./packages/*" --sequential build && \
    pnpm --filter @nordprint/storefront build

# -------------------------------------------------------------- runtime
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8000 \
    HOSTNAME=0.0.0.0

# Kør aldrig som root. `node`-brugeren findes allerede i basisimaget.
RUN addgroup --system --gid 1001 nordprint && \
    adduser --system --uid 1001 --ingroup nordprint nordprint

# Next.js' standalone-output indeholder præcis de node_modules, serveren
# bruger — resten kommer ikke med.
COPY --from=build --chown=nordprint:nordprint /app/apps/storefront/.next/standalone ./
COPY --from=build --chown=nordprint:nordprint /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=nordprint:nordprint /app/apps/storefront/public ./apps/storefront/public

USER nordprint
EXPOSE 8000

# Signalhåndtering: uden dette bliver SIGTERM ikke videresendt, og
# `docker compose down` venter ti sekunder på hver container.
STOPSIGNAL SIGTERM

CMD ["node", "apps/storefront/server.js"]
