#!/bin/sh
#
# NordPrint — PostgreSQL backup.
#
# Tager et komprimeret dump, verificerer at det kan læses, uploader det
# off-site og rydder op i gamle kopier.
#
# En backup er ikke færdig, fordi filen blev oprettet. Scriptet fejler
# højlydt, hvis dumpet er tomt, ulæseligt eller mangler de tabeller, en
# NordPrint-database altid har. Et dump på nul bytes, der stille erstatter
# gårsdagens, er værre end ingen backup — for så tror man, man har en.
#
# Bruges af backup-containeren i docker-compose.production.yml, og kan køres
# manuelt:
#
#   docker compose -f docker-compose.production.yml exec backup /opt/backup/backup.sh
#
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${BACKUP_DIR}/nordprint-${TIMESTAMP}.dump"

log() {
	printf '%s [backup] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1"
}

fail() {
	printf '%s [backup] FEJL: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >&2
	exit 1
}

mkdir -p "$BACKUP_DIR"

# ------------------------------------------------------------------- dump
#
# Custom format (-Fc): komprimeret, og pg_restore kan hente enkelte tabeller
# ud af det. Almindelig SQL er kun brugbart som alt-eller-intet.
log "Tager dump af ${PGDATABASE:-?} på ${PGHOST:-?} …"

if ! pg_dump --format=custom --compress=9 --no-owner --no-privileges \
	--file="$DUMP_FILE" 2>/tmp/pg_dump.err; then
	fail "pg_dump fejlede: $(cat /tmp/pg_dump.err)"
fi

# ---------------------------------------------------------------- verify
#
# Tre kontroller, fra billigst til dyrest.

# 1. Findes filen, og er den større end et tomt dump?
if [ ! -s "$DUMP_FILE" ]; then
	fail "Dumpfilen er tom."
fi

SIZE_BYTES="$(wc -c <"$DUMP_FILE")"
if [ "$SIZE_BYTES" -lt 4096 ]; then
	rm -f "$DUMP_FILE"
	fail "Dumpet er kun ${SIZE_BYTES} bytes — det kan ikke være en hel database."
fi

# 2. Kan pg_restore overhovedet læse arkivet? Fanger afbrudte skrivninger.
if ! pg_restore --list "$DUMP_FILE" >/tmp/pg_restore.list 2>/tmp/pg_restore.err; then
	rm -f "$DUMP_FILE"
	fail "Dumpet kan ikke læses af pg_restore: $(cat /tmp/pg_restore.err)"
fi

# 3. Indeholder det de tabeller, en NordPrint-database altid har? Fanger et
#    dump, der lykkedes mod den forkerte — eller en tom — database.
for table in "order" product product_variant filament_spec printer_model; do
	if ! grep -q "TABLE DATA public ${table} " /tmp/pg_restore.list; then
		rm -f "$DUMP_FILE"
		fail "Dumpet mangler tabellen '${table}'. Peger PGDATABASE på den rigtige database?"
	fi
done

TABLE_COUNT="$(grep -c 'TABLE DATA' /tmp/pg_restore.list || true)"
log "Dump verificeret: $((SIZE_BYTES / 1024)) KiB, ${TABLE_COUNT} tabeller."

# --------------------------------------------------------------- checksum
#
# Gemmes ved siden af dumpet, så restore kan kontrollere, at filen ikke er
# blevet beskadiget undervejs — hverken på disken eller i overførslen.
sha256sum "$DUMP_FILE" | awk '{print $1}' >"${DUMP_FILE}.sha256"

# --------------------------------------------------------------- off-site
#
# En backup, der ligger på den samme server som databasen, beskytter mod et
# uheldigt DELETE. Den beskytter ikke mod at serveren brænder.
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
	if ! command -v aws >/dev/null 2>&1; then
		log "ADVARSEL: aws-cli mangler i imaget — springer off-site upload over."
	else
		log "Uploader til ${BACKUP_S3_BUCKET} …"

		AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-}" \
		AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-}" \
		AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-auto}" \
			aws s3 cp "$DUMP_FILE" "s3://${BACKUP_S3_BUCKET}/postgres/" \
			${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"} ||
			fail "Upload mislykkedes. Backuppen findes kun lokalt."

		AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-}" \
		AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-}" \
		AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-auto}" \
			aws s3 cp "${DUMP_FILE}.sha256" "s3://${BACKUP_S3_BUCKET}/postgres/" \
			${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"} ||
			log "ADVARSEL: checksummen blev ikke uploadet."

		log "Off-site kopi gemt."
	fi
else
	log "ADVARSEL: BACKUP_S3_BUCKET er ikke sat. Backuppen ligger KUN på denne server."
fi

# --------------------------------------------------------------- retention
#
# Ryd op lokalt. De off-site kopier styres af bucket'ens livscyklusregler —
# se docs/backup-restore.md.
DELETED="$(find "$BACKUP_DIR" -name 'nordprint-*.dump*' -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)"
if [ "$DELETED" -gt 0 ]; then
	log "Slettede ${DELETED} filer ældre end ${RETENTION_DAYS} dage."
fi

log "Færdig: ${DUMP_FILE}"
