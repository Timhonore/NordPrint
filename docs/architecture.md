# Arkitektur

## Overblik

To applikationer, fire delte pakker, én database.

```
                        ┌──────────────────────────────┐
     Browser ───────────│  Next.js storefront (:8000)  │
                        │  App Router, serverkomponenter│
                        └───────────────┬──────────────┘
                                        │ HTTP, publishable key
                        ┌───────────────▼──────────────┐
                        │  Medusa server (:9000)       │
                        │  /store, /admin, /store/nordprint │
                        └───┬───────────────────────┬──┘
                            │                       │
                   ┌────────▼────────┐     ┌────────▼────────┐
                   │  PostgreSQL     │     │  Redis          │
                   │  produkter,     │     │  cache, events, │
                   │  ordrer, lager  │     │  jobkø, locks   │
                   └────────▲────────┘     └────────▲────────┘
                            │                       │
                        ┌───┴───────────────────────┴──┐
                        │  Medusa worker               │
                        │  MEDUSA_WORKER_MODE=worker   │
                        │  ingen offentlig port        │
                        └──────────────────────────────┘
```

Server og worker kører **samme image** med forskellig `MEDUSA_WORKER_MODE`.
De deler database og Redis, og kun serveren er eksponeret. Workeren håndterer
subscribers, planlagte jobs og alt der ikke må blokere et HTTP-svar.

## Hvorfor Medusa v2

Butikken har brug for ordrer, lager, priser, kampagner, moms og
betalingsflows — problemer, der er løst rigtigt én gang og forkert mange
gange. Medusas modulmodel gør det samtidig muligt at tilføje domæner, den
ikke selv kender: filament, printere og kompatibilitet er egne moduler med
egne migrationer, forbundet til produkter med `defineLink`.

Egne moduler i `apps/commerce/src/modules`:

| Modul           | Ansvar                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| `brand`         | Producenter. Storefront henter dem herfra — ingen brands i frontend-kode. |
| `filament`      | Filamentspecifikation pr. produkt og variant, plus typede attributter.    |
| `printer`       | Brand → familie → model.                                                  |
| `compatibility` | Regler mellem produkt/variant og printermodel.                            |
| `review`        | Anmeldelser med moderationsstatus og verificeret køb.                     |
| `guide`         | Redaktionelt indhold.                                                     |
| `wishlist`      | Favoritter for indloggede kunder.                                         |

## Datamodellen for filament

Kravet trak i to retninger: mange felter skal kunne filtreres effektivt, og
listen over felter må ikke være låst. Løsningen er hybrid.

**Indekserede kolonner** for det, der bruges i facetter og sortering:
materiale, finish, brand, diameter, nettovægt, farvefamilie, lagerstatus,
AMS-kompatibilitet, hærdet dyse. Disse er rigtige kolonner med indeks — de
skal kunne bære en katalogside med facettællinger på én forespørgsel.

**Typede attributter** for den lange hale: `filament_attribute_definition`
beskriver feltet (nøgle, label, enhed, gruppe, type), og
`filament_attribute_value` holder værdien i `value_number`, `value_text`
eller `value_boolean`. Trækstyrke, slagsejhed, genanvendt indhold og alt
andet, der kun vises på databladet, ligger her. En ny egenskab kræver ingen
migration — og fordi typen er kendt, kan en attribut markeres `filterable` og
alligevel bruges i en forespørgsel.

Se [produktmodellen](products.md) for felterne.

## Katalog og søgning

Al filtrering, sortering, paginering og facettælling sker i SQL i backenden.
Storefronten henter en side ad gangen og filtrerer aldrig i JavaScript.

Kernen er én delt CTE (`variant_source`) i
`apps/commerce/src/lib/search/variant-source.sql.ts`, som samler variant,
produkt, brand, filamentdata, pris og lager i én række pr. variant.
Facettællinger beregnes med den pågældende facets eget filter udeladt — ellers
ville "Sort (0)" stå ved siden af de sorte produkter, man lige har valgt.

Vigtigt om beløb: **Medusa gemmer priser som decimaltal i hovedenheder**
(189.00), mens NordPrint regner i øre overalt. Konverteringen sker ét sted, i
den delte CTE, med `ROUND(x * 100)::bigint`.

Søgning går gennem en provider-grænseflade
(`packages/commerce/src/search/provider.ts`). PostgreSQL-implementeringen
ligger i backenden. Søgeteksten parses til struktur før den rammer databasen:
"sort pla" bliver til farve=sort + materiale=pla, ikke til to tekstsøgninger.
Danske og engelske synonymer er kortlagt, så "hardened" finder "hærdet".
UI-komponenterne kender kun grænsefladen — en dedikeret søgemotor kan sættes
ind uden at røre dem.

## Pris og penge

Alle beløb er `{ amount: number, currencyCode: string }` i mindste enhed.
Formatering findes ét sted (`packages/commerce/src/money.ts`), og ESLint
afviser `Intl.NumberFormat` med valuta andre steder — også i admin.

Pris pr. kg beregnes i `packages/commerce/src/pricing.ts` og er testet mod de
konkrete eksempler: 189 kr / 1000 g → 189 kr/kg, 169 kr / 750 g → 225,33
kr/kg. Dækningsbidrag og margin beregnes samme sted og vises kun i admin —
kostprisen forlader aldrig backenden mod storefronten.

## Storefronten

Serverkomponenter er udgangspunktet. Klientkomponenter bruges kun, hvor der
er interaktion: farvevælger, mini-kurv, filterdrawer, søgefelt, wizard,
samtykke. Katalog, produktside, guides og forside renderes på serveren.

Filterstate ligger i URL'en (`/filament?material=pla&brand=nordprint`), så en
filtreret visning kan deles og bogmærkes, og browserens tilbage-knap virker.
Serialisering og parsing er den samme funktion begge veje
(`packages/commerce/src/filters.ts`), og en kategorisides eget scope
serialiseres bevidst ikke med — siden ejer det selv.

Gæstetilstand (printere, favoritter, sammenligning) ligger i localStorage
gennem `useSyncExternalStore`, så der hverken er hydreringseffekt eller
glimt af forkert indhold. Ved login flettes gæstens favoritter ind i kontoen.

## Routing

Butikkens sektioner (`/reservedele`, `/tilbehoer`, `/vaerktoej`,
`/3d-printere`), deres underkategorier og informationssiderne betjenes af ét
dynamisk segment, der slår slug'en op i registrene i `@nordprint/config`. En
ny afdeling er en konfigurationslinje og en kategori i backenden — ikke en ny
mappe i `app/`. Sitemap og routes læser samme register, så en side ikke kan
findes ét sted og mangle det andet.

En slug, der ikke findes i noget register, giver 404-siden. Bemærk: rammer
`notFound()` bag en streaming-grænse, er svaret allerede sendt som 200 —
Next indsætter `noindex`, så siden ikke indekseres. En e2e-test går hele
menuen og footeren igennem og fejler på døde links.

## Konti

Gæstekøb er hovedvejen — en konto er aldrig et krav for at handle. Men den, der
vil have en, får en rigtig én.

Medusa udsteder et JWT ved login. Det ligger i en httpOnly-cookie og læses kun
på serveren; et token i `localStorage` er et token, ethvert script på siden kan
tage. Kontosiderne er derfor server-renderede og dynamiske — de kan ikke
præ-genereres, fordi de afhænger af en cookie.

En detalje, der koster tid, hvis man ikke kender den: tokenet fra
`/auth/customer/emailpass/register` har et **tomt `actor_id`**, fordi kunden
ikke fandtes, da det blev udstedt. Hvert efterfølgende kald til
`/store/customers/*` svarer 401. Efter oprettelsen hentes derfor et nyt token
med `/auth/token/refresh` — ellers bliver kontoen oprettet, og kunden lander på
en side, der påstår, at de ikke er logget ind.

Ved login flettes gæstens tilstand ind i kontoen: favoritter gennem
`/store/nordprint/wishlist/merge`, gemte printere gennem
`/store/nordprint/me/printers`. De to kald er uafhængige og best effort — en
kunde, der lige er logget ind, må ikke få at vide, at login fejlede, fordi en
favorit ikke kunne kopieres.

Favoritter har to kilder afhængigt af tilstand: gæstens ligger i localStorage
og kan kun læses af klienten, mens en indlogget kundes ligger i databasen og
renderes på serveren — så de er de samme på telefonen og på computeren.

### GDPR-endepunkter

| Endpoint                                    | Hvad                                                                                                                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /store/nordprint/me/data-export`       | Alt, vi har registreret: kunde, adresser, ordrer, printere, favoritter, anmeldelser. Samles i backenden, fordi kun den kender alle moduler, der gemmer persondata.                  |
| `POST /store/nordprint/me/deletion-request` | Registrerer anmodningen. Bevidst en _anmodning_: bogføringsloven kræver fakturaer i fem år, så ordrehistorik skal anonymiseres i stedet — det er en vurdering, et menneske træffer. |

## Udbyder-abstraktioner

Betaling, fragt, e-mail, filer og søgning er grænseflader, ikke leverandører.
Hver har en udviklings-implementering, så butikken kan køres uden aftaler —
tydeligt mærket, aldrig tavs:

- **Betaling**: `AbstractPaymentProvider`. MobilePay mod Vipps MobilePay
  ePayment API. Udviklings-udbyderen registreres _kun_, når
  `NODE_ENV !== "production"`.
- **Fragt**: `AbstractFulfillmentProviderService` for GLS, DAO og PostNord.
  Uden nøgler returnerer udviklings-adapteren pakkeshops med `[TEST]` i navnet.
- **E-mail**: `AbstractNotificationProviderService`. Uden nøgle logges mailen
  i stedet for at blive sendt.
- **Filer**: S3-kompatibel. Cloudflare R2 i produktion, MinIO lokalt.
  Produktbilleder må ikke ligge på containerens disk.

## Konfiguration

`packages/config` læser miljøvariabler én gang og eksponerer typede objekter.
Fragtgrænser, lagergrænser, momssats, USP'er, antal produkter pr. side og
firmaoplysninger er konfiguration. Ingen af dem står som tal i en komponent.

`medusa-config.ts` nægter at starte i produktion uden `REDIS_URL`,
`S3_BUCKET`, `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET` og CORS. Det er
bevidst: en butik, der starter uden object storage, opdager det først, når
containeren genstartes og billederne er væk.

## Tests

| Type        | Antal | Hvad                                                                                     |
| ----------- | ----- | ---------------------------------------------------------------------------------------- |
| Unit        | 100   | Priser, penge, filtre, søgeparsing, anbefalingsregler, kompatibilitet, JSON-LD-escaping. |
| Integration | 20    | CSV-import: parsing, validering, preview, fejlhåndtering.                                |
| E2E         | 47    | Købsrejsen på 360, 768 og 1440 px.                                                       |

E2E dækker det, der koster penge, når det går i stykker: katalog og filtre i
URL'en, pris pr. kg, farvevalg, udsolgte varianter, læg-i-kurv til checkout,
søgning på dansk og engelsk, den guidede vælger, oprettelse af konto med
dataeksport og log ud, døde links og tilgængelighed.

Testen "ingen døde links i menu og footer" går hver eneste interne href i
header og footer igennem og åbner den. Den findes, fordi 24 links i sin tid
pegede på sider, der aldrig var bygget — statuskoden alene afslørede det ikke,
for `notFound()` bag en streaming-grænse svarer 200. Testen kigger derfor på
den overskrift, brugeren rent faktisk ser.

## Pakkeformater

De delte pakker bygges både som CommonJS og ESM. Medusa-serveren `require`er
dem; Next og Medusas admin-build (Vite/Rollup) importerer ESM-udgaven, fordi
en bundler ikke kan se navngivne eksporter i en CommonJS-fil og fejler med
"is not exported by".

`public-hoist-pattern[]=@medusajs/*` i `.npmrc` er der af beslægtede årsager:
Medusas admin genererer en `entry.jsx`, der importerer Medusas egne interne
pakker, og med pnpms strikte linkning ligger de kun i `.pnpm`-butikken.
