#!/usr/bin/env bash
#
# NordPrint — rul tilbage til forrige version.
#
#   ./infrastructure/scripts/rollback.sh [git-sha]
#
# Ruller KODEN tilbage. Databasen rulles ikke tilbage automatisk: en
# migration kan have ændret data, som den gamle kode ikke kan læse, og et
# automatisk restore ville i så fald smide de ordrer væk, der er kommet ind
# siden. Se docs/backup-restore.md, hvis databasen også skal tilbage.
#
set -euo pipefail

COMPOSE="docker compose -f docker-compose.production.yml"
STATE_DIR=".deploy"

log() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m==>\033[0m %s\n' "$1" >&2; }
fail() { printf '\033[1;31m==> FEJL:\033[0m %s\n' "$1" >&2; exit 1; }

TARGET_SHA="${1:-}"

if [ -z "$TARGET_SHA" ]; then
	[ -f "${STATE_DIR}/previous-sha" ] ||
		fail "Ingen tidligere version registreret. Angiv en sha manuelt."
	TARGET_SHA="$(cat "${STATE_DIR}/previous-sha")"
fi

log "Ruller tilbage til ${TARGET_SHA:0:8} …"

git checkout --quiet "$TARGET_SHA" || fail "Kunne ikke skifte til ${TARGET_SHA}."

log "Bygger den tidligere version …"
$COMPOSE build storefront medusa-server medusa-worker

log "Starter tjenester …"
$COMPOSE up -d --wait medusa-server medusa-worker storefront

warn "Koden er rullet tilbage. Databasen er IKKE rullet tilbage."
warn "Hvis en migration skal fortrydes, se docs/backup-restore.md."

log "Rollback færdig: $(git rev-parse --short HEAD)"
