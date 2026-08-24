# Deployment

Fra push til kørende butik:

```
GitHub push → GitHub Actions (CI) → Deploy-workflow → SSH → VPS
                                                             │
                                    docker compose build ────┤
                                    backup af database   ────┤
                                    migrationer          ────┤
                                    rul containere       ────┤
                                    healthcheck          ────┘
                                                             │
                                                     Caddy → NordPrint
```

Der findes **ingen sti, hvor en fejlet build bliver deployet**. Deploy-workflowet
udløses af `workflow_run`, som også fyrer ved fejl, så det første job
kontrollerer `conclusion` eksplicit, før noget andet kører.

## Forudsætninger på VPS'en

- Linux med Docker og Docker Compose plugin
- Git-klon af repoet, med en `.env` udfyldt efter `.env.example`
- DNS: `nordprint.dk`, `www`, `api` og `admin` peger på serveren
- Port 80 og 443 åbne. Ikke andet.

PostgreSQL og Redis er **ikke** eksponeret. De ligger på et Docker-netværk
med `internal: true`, som ikke har adgang til internettet og ikke kan nås
udefra. Applikationscontainerne ligger på begge netværk, fordi de skal kunne
nå MobilePay, fragtudbydere og R2.

## Første opsætning

```bash
git clone <repo> /opt/nordprint && cd /opt/nordprint
cp .env.example .env && "${EDITOR}" .env      # udfyld ALT markeret [KRÆVES I PRODUKTION]

docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d postgres redis
docker compose -f docker-compose.production.yml run --rm medusa-server pnpm --filter @nordprint/commerce-backend migrate
docker compose -f docker-compose.production.yml up -d
```

Opret den første administrator:

```bash
docker compose -f docker-compose.production.yml exec medusa-server \
  npx medusa user --email dig@nordprint.dk --invite
```

Hent en publishable key i Admin → Indstillinger → API-nøgler og sæt
`MEDUSA_PUBLISHABLE_KEY` i `.env`. Den læses ved kørsel, ikke ved build — en
ny nøgle kræver ingen ny image-build.

Kør **ikke** seed'en i produktion. Den opretter udviklingsdata.

## Hemmeligheder i GitHub

Deploy-workflowet bruger `secrets` og `vars` fra et GitHub Environment kaldet
`production`. Der står ingen credentials i workflow-filerne.

| Secret                       | Hvad                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `DEPLOY_SSH_KEY`             | Privat nøgle med adgang til deploy-brugeren.                                         |
| `DEPLOY_KNOWN_HOSTS`         | Serverens værtsnøgle. Pinnes, så en kompromitteret DNS ikke kan omdirigere deployet. |
| `DEPLOY_HOST`, `DEPLOY_USER` | Hvor der deployes hen.                                                               |

| Variable                          | Hvad                                                |
| --------------------------------- | --------------------------------------------------- |
| `DEPLOY_PATH`                     | Sti til klonen på serveren.                         |
| `STOREFRONT_DOMAIN`, `API_DOMAIN` | Bruges til at verificere, at siden svarer bagefter. |

Sæt manuel godkendelse på environmentet, hvis der skal et menneske i loopet
før produktion.

## Hvad deploy.sh gør

1. **Gemmer nuværende commit** i `.deploy/previous-sha`, så rollback har noget
   at vende tilbage til.
2. **Henter koden** — den commit, workflowet blev udløst af.
3. **Bygger images først.** Den langsomme del sker, mens den gamle version
   stadig betjener kunder.
4. **Backup af databasen før migrationer.** En migration, der går galt, må
   ikke være det sted, man opdager, at der ikke er en backup.
5. **Migrerer én gang, fra én container.** Migrationer køres bevidst ikke ved
   containeropstart: to containere, der starter samtidigt, ville migrere oven
   i hinanden.
6. **Ruller containerne** — server, worker, storefront.
7. **Kontrollerer at det virker.** Deployet er ikke færdigt, fordi containerne
   startede; det er færdigt, når butikken svarer.

Fejler et af trinnene, kører `rollback.sh` automatisk fra workflowet og
sætter den forrige commit tilbage.

## Nedetid

Compose starter den nye container, før den gamle stoppes, og Caddy sender
først trafik videre, når healthchecket er grønt. I praksis er der et kort
vindue under omrulningen. Skal det helt væk, kræver det to sæt containere og
et skift i Caddy — det er ikke bygget ind, fordi det koster kompleksitet, som
en butik af denne størrelse ikke får noget for.

Migrationer skal være bagudkompatible. Kører den gamle storefront i få
sekunder mod et nyt skema, må den ikke gå ned: tilføj kolonner før de bruges,
og fjern dem først et deploy senere.

## Caddy

`infrastructure/caddy/Caddyfile` styrer de fire domæner og henter certifikater
automatisk gennem Let's Encrypt. `ACME_EMAIL` skal være en adresse, du læser —
det er dér, advarsler om udløbne certifikater lander.

`www.nordprint.dk` redirecter permanent til apex, så der kun er én kanonisk
adresse.

## Efter deploy

```bash
docker compose -f docker-compose.production.yml ps          # kører alt?
docker compose -f docker-compose.production.yml logs -f medusa-server
curl -sf https://api.nordprint.dk/health
```

Worker-containeren har ingen port. At den ikke svarer på HTTP er meningen —
tjek den i loggen.

## Rollback

```bash
./infrastructure/scripts/rollback.sh
```

Sætter koden tilbage til `.deploy/previous-sha` og bygger og ruller igen.
**Rollback ruller ikke databasen tilbage.** Var der en destruktiv migration
med i deployet, skal databasen gendannes fra backuppen, der blev taget i trin
4 — se [backup-restore.md](backup-restore.md).
