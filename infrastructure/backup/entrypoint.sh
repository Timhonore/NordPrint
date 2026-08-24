#!/bin/sh
#
# Backup-containerens entrypoint.
#
# Kører backup.sh én gang ved opstart (så en ny installation har en kopi med
# det samme) og derefter hver nat kl. 03:00 UTC.
#
# Bevidst en simpel løkke frem for cron: den logger til stdout som alt andet
# i stakken, den kræver ingen ekstra pakke i imaget, og `docker compose logs
# backup` viser hvad der er sket.
#
set -eu

log() {
	printf '%s [backup-scheduler] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1"
}

# aws-cli bruges til off-site upload. Installeres kun hvis den skal bruges,
# så imaget ikke vokser unødigt for installationer uden off-site backup.
if [ -n "${BACKUP_S3_BUCKET:-}" ] && ! command -v aws >/dev/null 2>&1; then
	log "Installerer aws-cli til off-site upload …"
	apk add --no-cache aws-cli >/dev/null 2>&1 || log "ADVARSEL: aws-cli kunne ikke installeres."
fi

log "Tager en backup ved opstart."
sh /opt/backup/backup.sh || log "Opstartsbackuppen fejlede — fortsætter alligevel."

while true; do
	# Sekunder til næste kl. 03:00 UTC.
	NOW="$(date -u +%s)"
	TODAY_0300="$(date -u -d "$(date -u +%Y-%m-%d) 03:00:00" +%s 2>/dev/null || echo 0)"

	if [ "$TODAY_0300" -eq 0 ]; then
		# BusyBox' date kan ikke -d på alle images; så kører vi hver 24. time
		# fra opstart i stedet. Mindre præcist, lige så pålideligt.
		SLEEP_SECONDS=86400
	else
		if [ "$NOW" -ge "$TODAY_0300" ]; then
			TARGET=$((TODAY_0300 + 86400))
		else
			TARGET="$TODAY_0300"
		fi
		SLEEP_SECONDS=$((TARGET - NOW))
	fi

	log "Næste backup om $((SLEEP_SECONDS / 3600)) timer."
	sleep "$SLEEP_SECONDS"

	sh /opt/backup/backup.sh || log "Backuppen fejlede. Den næste forsøges i morgen."
done
