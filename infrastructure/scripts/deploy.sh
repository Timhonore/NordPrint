#!/usr/bin/env bash
#
# NordPrint — deploy på VPS'en.
#
#   ./infrastructure/scripts/deploy.sh <git-sha>
#
# Rækkefølgen er ikke tilfældig:
#
#   1. Gem den nuværende commit, så rollback.sh har noget at vende tilbage til
#   2. Hent koden
#   3. Byg de nye images (den langsomme del — sker mens den gamle version kører)
#   4. Backup af databasen FØR migrationer
#   5. Migrér én gang, fra én container
#   6. Rul server, worker og storefront
#   7. Kontrollér at det virker
#
# Migrationer køres separat og ikke ved container-opstart: to containere, der
# starter samtidigt, ville ellers migrere oven i hinanden.
#
set -euo pipefail

TARGET_SHA="${1:-}"
COMPOSE="docker compose -f docker-compose.production.yml"
STATE_DIR=".deploy"

log() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m==>\033[0m %s\n' "$1" >&2; }
fail() { printf '\033[1;31m==> FEJL:\033[0m %s\n' "$1" >&2; exit 1; }

[ -f .env ] || fail ".env mangler. Kopiér .env.example og udfyld den."
[ -f docker-compose.production.yml ] || fail "Kør scriptet fra projektets rod."

mkdir -p "$STATE_DIR"

# ------------------------------------------------------- 1. gem nuværende
PREVIOUS_SHA="$(git rev-parse HEAD)"
echo "$PREVIOUS_SHA" > "${STATE_DIR}/previous-sha"
log "Nuværende version: ${PREVIOUS_SHA:0:8}"

# ---------------------------------------------------------- 2. hent kode
log "Henter kode …"
git fetch --quiet origin

if [ -n "$TARGET_SHA" ]; then
	git checkout --quiet "$TARGET_SHA"
else
	git checkout --quiet main && git pull --quiet --ff-only origin main
fi

log "Deployer version: $(git rev-parse --short HEAD)"

# ---------------------------------------------------------- 3. byg images
#
# Bygges før noget stoppes, så den gamle version bliver ved med at servere
# kunder, mens den nye bliver til.
log "Bygger images …"
$COMPOSE build --pull storefront medusa-server medusa-worker

# ------------------------------------------------------------- 4. backup
#
# Før migrationerne. En migration, der går galt halvvejs, er præcis det
# tidspunkt, hvor man opdager, at man ikke havde en backup.
log "Tager backup før migrering …"
$COMPOSE up -d postgres
$COMPOSE exec -T postgres pg_isready -q -t 30 || fail "PostgreSQL svarer ikke."

if $COMPOSE run --rm --no-deps backup sh /opt/backup/backup.sh; then
	log "Backup taget."
else
	fail "Backuppen fejlede. Deployet er stoppet — migrér ikke uden en backup."
fi

# ---------------------------------------------------------- 5. migrationer
#
# Én container, én gang. `run --rm` starter en midlertidig container, som
# forsvinder bagefter.
log "Kører migrationer …"
$COMPOSE run --rm --no-deps \
	-e MEDUSA_WORKER_MODE=server \
	medusa-server npx medusa db:migrate ||
	fail "Migrationerne fejlede. Den gamle version kører stadig — se docs/backup-restore.md, hvis databasen skal rulles tilbage."

# --------------------------------------------------------------- 6. rul ud
#
# Rækkefølgen betyder noget: backend først, så storefront'en aldrig kalder
# en API, der endnu ikke kender det nye skema.
log "Starter medusa-server …"
$COMPOSE up -d --no-deps --wait medusa-server ||
	fail "medusa-server blev ikke sund. Se: $COMPOSE logs medusa-server"

log "Starter medusa-worker …"
$COMPOSE up -d --no-deps --wait medusa-worker ||
	warn "Worker'en blev ikke sund. Butikken kører, men jobs og mails gør ikke."

log "Starter storefront …"
$COMPOSE up -d --no-deps --wait storefront ||
	fail "Storefront blev ikke sund. Se: $COMPOSE logs storefront"

log "Genindlæser Caddy …"
$COMPOSE up -d --no-deps caddy

# ------------------------------------------------------------ 7. kontrollér
log "Kontrollerer …"

for attempt in $(seq 1 20); do
	if $COMPOSE exec -T medusa-server node -e \
		"fetch('http://127.0.0.1:9000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
		log "API er sund."
		break
	fi
	[ "$attempt" -lt 20 ] || fail "API blev aldrig sund."
	sleep 3
done

# Ryd op i images, der ikke længere refereres. Uden dette løber en VPS med
# 40 GB disk tør efter et par måneders deploys.
log "Rydder op i gamle images …"
docker image prune --force --filter "until=168h" >/dev/null 2>&1 || true

log "Deploy færdig: $(git rev-parse --short HEAD)"
