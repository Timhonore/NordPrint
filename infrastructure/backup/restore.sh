#!/bin/sh
#
# NordPrint — gendannelse af PostgreSQL.
#
#   ./restore.sh /backups/nordprint-20260823T030000Z.dump
#   ./restore.sh --verify /backups/nordprint-20260823T030000Z.dump
#
# Med --verify gendannes dumpet til en midlertidig database, indholdet
# kontrolleres, og databasen smides væk igen. Produktionsdatabasen røres
# ikke. Det er sådan man tester en backup uden at holde vejret — og det bør
# køres på en tidsplan, ikke kun den dag man får brug for det.
#
# Uden --verify gendannes der til PGDATABASE. Det er destruktivt, og scriptet
# beder om en udtrykkelig bekræftelse først.
#
set -eu

VERIFY_ONLY=0
DUMP_FILE=""

while [ $# -gt 0 ]; do
	case "$1" in
	--verify)
		VERIFY_ONLY=1
		shift
		;;
	--yes)
		ASSUME_YES=1
		shift
		;;
	-*)
		printf 'Ukendt flag: %s\n' "$1" >&2
		exit 2
		;;
	*)
		DUMP_FILE="$1"
		shift
		;;
	esac
done

log() {
	printf '%s [restore] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1"
}

fail() {
	printf '%s [restore] FEJL: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >&2
	exit 1
}

[ -n "$DUMP_FILE" ] || fail "Angiv en dumpfil. Se kommentaren øverst i scriptet."
[ -f "$DUMP_FILE" ] || fail "Filen findes ikke: ${DUMP_FILE}"

# ------------------------------------------------------------- checksum
if [ -f "${DUMP_FILE}.sha256" ]; then
	EXPECTED="$(cat "${DUMP_FILE}.sha256")"
	ACTUAL="$(sha256sum "$DUMP_FILE" | awk '{print $1}')"
	[ "$EXPECTED" = "$ACTUAL" ] || fail "Checksummen passer ikke. Filen er beskadiget."
	log "Checksum OK."
else
	log "ADVARSEL: ingen .sha256 ved siden af dumpet — kan ikke verificere integriteten."
fi

pg_restore --list "$DUMP_FILE" >/dev/null 2>&1 || fail "Dumpet kan ikke læses."

# --------------------------------------------------------------- verify
if [ "$VERIFY_ONLY" -eq 1 ]; then
	TEMP_DB="nordprint_restore_test_$(date -u +%s)"
	log "Gendanner til midlertidig database ${TEMP_DB} …"

	createdb "$TEMP_DB" || fail "Kunne ikke oprette ${TEMP_DB}."

	# Ryd altid op, også hvis noget herunder fejler.
	trap 'dropdb --if-exists "$TEMP_DB" >/dev/null 2>&1 || true' EXIT

	# --no-owner: rollerne fra produktion findes ikke nødvendigvis her.
	# Advarsler er forventelige; kun en hård fejl tæller.
	if ! pg_restore --dbname="$TEMP_DB" --no-owner --no-privileges \
		--jobs=4 "$DUMP_FILE" 2>/tmp/restore.err; then
		if grep -qiE 'error: ' /tmp/restore.err; then
			cat /tmp/restore.err >&2
			fail "Gendannelsen fejlede."
		fi
		log "Gendannet med advarsler (typisk manglende roller — det er forventeligt)."
	fi

	log "Kontrollerer indholdet …"

	# Tæl rækker i de tabeller, en fungerende shop ikke kan undvære. En
	# gendannelse, der "lykkedes" men gav nul produkter, er ikke en
	# gendannelse.
	for check in "product:1" "product_variant:1" "printer_model:1"; do
		table="${check%%:*}"
		minimum="${check##*:}"
		count="$(psql --dbname="$TEMP_DB" --tuples-only --no-align \
			--command="SELECT COUNT(*) FROM ${table} WHERE deleted_at IS NULL;" 2>/dev/null || echo 0)"

		[ "$count" -ge "$minimum" ] ||
			fail "Tabellen '${table}' indeholder ${count} rækker — forventede mindst ${minimum}."

		log "  ${table}: ${count} rækker"
	done

	ORDERS="$(psql --dbname="$TEMP_DB" --tuples-only --no-align \
		--command='SELECT COUNT(*) FROM "order";' 2>/dev/null || echo 0)"
	log "  order: ${ORDERS} rækker"

	log "Verifikation gennemført. Backuppen kan gendannes."
	exit 0
fi

# -------------------------------------------------------------- restore
log "Dette OVERSKRIVER databasen '${PGDATABASE}' på '${PGHOST}'."
log "Alle nuværende data i den database går tabt."

if [ "${ASSUME_YES:-0}" -ne 1 ]; then
	printf 'Skriv databasenavnet for at bekræfte: '
	read -r CONFIRMATION
	[ "$CONFIRMATION" = "$PGDATABASE" ] || fail "Ikke bekræftet. Intet er ændret."
fi

# Stop apps'ene først, ellers skriver de videre til den database, vi er ved
# at rive ned under dem.
log "Husk at have stoppet medusa-server og medusa-worker (se docs/backup-restore.md)."

log "Gendanner …"

# --clean --if-exists dropper de eksisterende objekter først. Uden det
# lander man i en halvgendannet database med dubletter.
if ! pg_restore --dbname="$PGDATABASE" --clean --if-exists \
	--no-owner --no-privileges --jobs=4 "$DUMP_FILE" 2>/tmp/restore.err; then
	if grep -qiE '^pg_restore: error: ' /tmp/restore.err; then
		cat /tmp/restore.err >&2
		fail "Gendannelsen fejlede. Databasen kan være i en delvis tilstand."
	fi
	log "Gendannet med advarsler."
fi

PRODUCTS="$(psql --tuples-only --no-align \
	--command='SELECT COUNT(*) FROM product WHERE deleted_at IS NULL;')"
log "Gendannelsen er færdig. ${PRODUCTS} produkter i databasen."
log "Start medusa-server og medusa-worker igen."
