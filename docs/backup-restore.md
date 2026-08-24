# Backup & restore

> En backup er ikke færdig, fordi filen kan oprettes. Den er færdig, når den
> er gendannet.

## Hvad der sikkerhedskopieres

| Data                     | Hvordan                                        | Hvor                                       |
| ------------------------ | ---------------------------------------------- | ------------------------------------------ |
| PostgreSQL               | `pg_dump -Fc`, dagligt                         | `backup`-containerens volume + off-site S3 |
| Produktbilleder og filer | Ligger allerede i object storage (R2/S3)       | Udbyderens egen versionering               |
| `.env`                   | **Ikke automatisk.** Indeholder hemmeligheder. | Password manager                           |

Filerne ligger bevidst ikke i database-backuppen. De hører hjemme i object
storage, netop fordi de ikke må afhænge af en container, der kan forsvinde.

`.env` skal opbevares et sted, der ikke er den server, den beskytter. Uden
`JWT_SECRET` og `COOKIE_SECRET` er en gendannet database ikke en fungerende
butik.

## Daglig kørsel

`backup`-containeren i `docker-compose.production.yml` kører
`infrastructure/backup/backup.sh` på en tidsplan. Manuelt:

```bash
docker compose -f docker-compose.production.yml exec backup /opt/backup/backup.sh
```

Scriptet dumper, verificerer, skriver en sha256 ved siden af, uploader
off-site og rydder op efter `BACKUP_RETENTION_DAYS` (standard 14).

### Verifikationen i backup.sh

Tre kontroller, fra billigst til dyrest:

1. **Er filen større end et tomt dump?** Fanger en fejlet forbindelse.
2. **Kan `pg_restore --list` læse arkivet?** Fanger en afbrudt skrivning.
3. **Er de tabeller til stede, en NordPrint-database altid har?** Fanger et
   dump taget mod den forkerte — eller en tom — database.

Fejler en af dem, afsluttes scriptet med en fejl, og gårsdagens backup
overskrives ikke. Et dump på nul bytes, der stille afløser en god backup, er
værre end ingen backup: så tror man, man har en.

### Off-site

```bash
BACKUP_S3_BUCKET=
BACKUP_S3_ENDPOINT=
BACKUP_S3_REGION=auto
BACKUP_S3_ACCESS_KEY_ID=
BACKUP_S3_SECRET_ACCESS_KEY=
```

Uden dem advarer scriptet: _"Backuppen ligger KUN på denne server."_ Det er
med vilje højlydt. En backup, der ligger på den disk, den beskytter, hjælper
ikke ved diskfejl, ransomware eller en slettet server.

## Test af gendannelsen

```bash
./infrastructure/backup/restore.sh --verify /backups/nordprint-20260824T122606Z.dump
```

Gendanner til en midlertidig database, tæller rækker i de tabeller, der skal
have indhold, og smider databasen væk igen. Produktionsdatabasen røres ikke.

**Kør det på en tidsplan** — ikke kun den dag, du får brug for det.

### Afprøvet

Proceduren er kørt mod en rigtig database, ikke kun læst igennem:

```
[restore] Checksum OK.
[restore] Gendanner til midlertidig database nordprint_restore_test_1787574373 …
[restore] Kontrollerer indholdet …
[restore]   product: 12 rækker
[restore]   product_variant: 40 rækker
[restore]   printer_model: 8 rækker
[restore]   order: 0 rækker
[restore] Verifikation gennemført. Backuppen kan gendannes.        exit 0
```

Og de tre måder, det kan gå galt, er også afprøvet — alle tre afviser med
exit-kode 1, så en cron-kørsel fejler synligt i stedet for at melde succes:

| Situation                             | Resultat                                              |
| ------------------------------------- | ----------------------------------------------------- |
| Manipuleret fil, checksum passer ikke | `FEJL: Checksummen passer ikke. Filen er beskadiget.` |
| Afbrudt dump                          | `FEJL: Dumpet kan ikke læses.`                        |
| Tomt dump                             | `FEJL: Dumpet kan ikke læses.`                        |

Efter kørslerne er der ingen efterladte `nordprint_restore_test_*`-databaser.

## Rigtig gendannelse

Destruktivt. Scriptet beder om en udtrykkelig bekræftelse først.

```bash
cd /opt/nordprint
./infrastructure/backup/restore.sh /backups/nordprint-20260824T030000Z.dump
```

Rækkefølgen scriptet holder:

1. Kontrollér checksum.
2. **Stop storefront, server og worker.** Ellers skriver de videre til den
   database, der er ved at blive revet ned under dem.
3. `pg_restore --clean --if-exists` — de eksisterende objekter droppes først.
   Uden det ender man i en halvgendannet database med dubletter.
4. Start applikationerne igen.
5. Kontrollér at butikken svarer.

## Katastrofeberedskab

Serveren er væk. Sådan kommer butikken tilbage:

1. **Ny server** med Docker og Docker Compose.
2. **Klon repoet** og læg `.env` tilbage fra din password manager.
3. **Hent den nyeste backup** fra off-site.
4. `docker compose -f docker-compose.production.yml up -d postgres redis`
5. `./infrastructure/backup/restore.sh <dump>`
6. `docker compose -f docker-compose.production.yml up -d`
7. **Peg DNS** mod den nye server. Caddy henter nye certifikater automatisk.
8. Kontrollér: forsiden, et produkt, læg-i-kurv, admin-login.

Objektlagringen følger ikke med serveren — den ligger hos R2 og er der
stadig. Derfor er `S3_*` i `.env` det, der skal være rigtigt, for at
produktbillederne kommer tilbage.

**Realistisk gendannelsestid:** 30-60 minutter plus DNS-udbredelse.
**Maksimalt datatab:** op til et døgn med daglig backup. Skal det være
mindre, er svaret WAL-arkivering — ikke hyppigere dumps.
