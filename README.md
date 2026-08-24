# NordPrint

**Alt til dit næste print.** Dansk webshop til filament, 3D-printere, reservedele og udstyr.

Monorepo med en Next.js-storefront og en Medusa v2-backend. Bygget til at køre på
én Linux-VPS bag Caddy — ikke som demo.

```
Kunde → Caddy (HTTPS) ─┬→ nordprint.dk        → Next.js storefront
                       ├→ api.nordprint.dk    → Medusa server
                       └→ admin.nordprint.dk  → Medusa Admin
                                                   │
                          medusa-worker ───────────┼→ PostgreSQL
                          (baggrundsjobs)          └→ Redis
```

## Indhold

| Sti                 | Hvad                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `apps/storefront`   | Next.js App Router. Serverkomponenter, dansk UI.                                            |
| `apps/commerce`     | Medusa v2: domænemoduler, API, workflows, admin-udvidelser.                                 |
| `packages/commerce` | Priser, penge, filtre, søgeparsing, anbefalingsregler. Al forretningslogik der skal testes. |
| `packages/types`    | Delte typer mellem frontend og backend.                                                     |
| `packages/ui`       | Designsystem: farvevælger, prisvisning, lagerindikator.                                     |
| `packages/config`   | Konfiguration læst fra miljøvariabler. Ingen hardcodede forretningsregler.                  |
| `infrastructure`    | Caddy, Dockerfiles, backup, deploy-scripts.                                                 |
| `docs`              | Arkitektur, deployment, betaling, produktmodel, backup.                                     |

## Kom i gang

Kræver Node 22+, pnpm 9+, Docker.

```bash
pnpm install
cp .env.example .env               # udfyld — se kommentarerne i filen
docker compose up -d               # PostgreSQL, Redis, MinIO

pnpm --filter @nordprint/commerce-backend migrate
pnpm --filter @nordprint/commerce-backend seed

pnpm dev                           # storefront :8000, backend :9000, admin :9000/app
```

Seed'en skriver selv den genererede publishable key til
`apps/storefront/.env.local` og nægter at melde succes, hvis opsætningen ikke
kan bruges til at handle. Alle seed-produkter er markeret
`metadata.seed=nordprint-dev` — det er udviklingsdata, ikke rigtige varer.

## Kommandoer

```bash
pnpm dev              # alt i udviklingstilstand
pnpm build            # bygger pakker og apps i rækkefølge
pnpm lint             # ESLint
pnpm format           # Prettier --write
pnpm --recursive test # unit- og integrationstests (120)
pnpm test:e2e         # Playwright, tre viewports (47)
```

`pnpm test:e2e` starter selv backend og storefront. Er der allerede en
Chromium installeret et andet sted end Playwrights egen, så peg på den med
`PLAYWRIGHT_CHROMIUM_PATH`.

## Dokumentation

- [Arkitektur](docs/architecture.md) — hvordan delene hænger sammen, og hvorfor.
- [Deployment](docs/deployment.md) — fra GitHub til VPS.
- [Betaling](docs/payments.md) — MobilePay, kort, og hvad der mangler før rigtige penge.
- [Produktmodel](docs/products.md) — filamentdata, varianter, printere, kompatibilitet.
- [Backup & restore](docs/backup-restore.md) — inklusive den afprøvede gendannelse.
- [Sikkerhed](SECURITY.md) — rapportering og de valg der er truffet.

## Status

Butikken kan gennemføre et køb med udviklings-betalingsudbyderen. Før den kan
tage imod rigtige penge, mangler der aftaler og nøgler hos betalings- og
fragtudbydere — det er beskrevet konkret i [docs/payments.md](docs/payments.md)
og i `.env.example`. Der er ingen sti, hvor produktionstilstand viser en falsk
"betaling gennemført".
