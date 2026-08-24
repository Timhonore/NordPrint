# Produktmodellen

## Lagene

```
Medusa Product          ← titel, beskrivelse, kategorier, status
   │
   ├── Medusa Variant   ← SKU, EAN, pris, lager, billeder
   │      └── FilamentVariantSpec   ← farve, hex, diameter, vægt, forventet genopfyldning
   │
   ├── FilamentSpec     ← materiale, temperaturer, egenskaber, datablade
   │      └── FilamentAttributeValue  ← den lange hale, typet
   │
   ├── Brand            ← producent (aldrig hardcodet i frontend)
   │
   └── CompatibilityRule ← forhold til en printermodel
```

Produkt og variant er Medusas. Alt filamentspecifikt hænger på gennem
`defineLink`, så Medusas egne workflows — ordrer, lager, priser — bliver ved
med at virke.

## Lager

Lager styres **på variantniveau**, ikke på produkt. En sort spole kan være
udsolgt, mens den hvide er på lager, og produktsiden skal vise det.

Grænserne er konfiguration:

```bash
NORDPRINT_STOCK_IN_STOCK_ABOVE=5     # over 5   → "På lager"
NORDPRINT_STOCK_LOW_AT_OR_BELOW=5    # 1-5      → "Kun få tilbage"
NORDPRINT_ALLOW_BACKORDER=false      # 0        → "Udsolgt"
```

Negative lagertal opstår ikke, medmindre backorders eksplicit er slået til.

Lagerstatus vises aldrig med farve alene. Der står altid en tekst, og
udsolgte farver i farvevælgeren er både overstreget og navngivet som
udsolgte for skærmlæsere.

## Filamentdata

### Indekserede felter

Det, der bruges til at filtrere, sortere og facettere, er rigtige kolonner
med indeks:

`material` · `material_variant` · `finish` · `diameter_mm` ·
`net_filament_weight_g` · `abrasive` · `ams_compatible` ·
`ams_lite_compatible` · `hardened_nozzle_recommended` ·
`enclosure_recommended` — og på varianten `color_family`, `color_hex`,
`diameter_mm`, `net_filament_weight_g`.

### Databladet

`manufacturer` · `gross_weight_g` · `nozzle_temperature_min/max` ·
`bed_temperature_min/max` · `drying_temperature` · `drying_duration_hours` ·
`max_volumetric_speed` · `heat_resistance_c` · `spool_material` ·
`food_contact_information` · `technical_datasheet_url` ·
`safety_datasheet_url`

### Materialeegenskaber

Seks vurderinger fra 1 til 5, gemt i backenden og vist som prikker:
printvenlighed, styrke, fleksibilitet, varmebestandighed, UV-bestandighed,
lagbinding. De er data, ikke tal skrevet ind i en komponent — og hver prik-
række har en tekstlig ækvivalent ("Styrke: 3 ud af 5").

### Den lange hale

Alt andet ligger som typede attributter:

```
filament_attribute_definition   nøgle, label, type, enhed, gruppe, filterbar, rang
filament_attribute_value        value_number | value_text | value_boolean
```

Trækstyrke, bøjningsmodul, slagsejhed, genanvendt indhold, anbefalet
printhastighed — sådan noget. En ny egenskab kræver ingen migration, og fordi
typen er kendt, kan en attribut markeres `filterable` og alligevel bruges i en
forespørgsel. Grupperne styrer, hvordan databladet inddeles på produktsiden.

## Varianter og farve

En variant har SKU, EAN/GTIN, pris, førpris, lager, billeder, aktiv-flag og
forventet genopfyldningsdato. Farven er `color_name`, `color_hex`, evt.
`color_hex_secondary` for tofarvede spoler, producentens egen farvekode og en
`color_family` til filtrering.

Farvevælgeren er ikke en dropdown. Det er en `radiogroup` med
piletastnavigation, hvor hvert felt viser farven, og hvor markering opdaterer
URL'en (`?farve=jade-white`), prisen, SKU'et, lagerlinjen og galleriet på én
gang. Udsolgte farver kan stadig vælges — man skal kunne se
genopfyldningsdatoen — men købsknappen er slået fra.

## Pris pr. kg

Beregnes altid, aldrig indtastet:

```
pris_pr_kg = pris × 1000 / nettovægt_g
```

189 kr for 1000 g → 189 kr/kg. 169 kr for 750 g → 225,33 kr/kg.

Beregningen ligger ét sted (`packages/commerce/src/pricing.ts`) og er testet
mod netop de eksempler. Det er den eneste ærlige måde at sammenligne to
spoler af forskellig vægt, og derfor står den både på produktkortet, på
produktsiden og som sorteringsmulighed.

## Printere

Tre niveauer: **brand → familie → model**. Bambu Lab → A-serien → A1.

Der er intet i modellen, der kender Bambu Lab. Prusa, Creality, Elegoo,
Anycubic, Sovol, Voron, Qidi og FlashForge tilføjes som rækker, ikke som kode.
Seed'en opretter Bambu Lab A1, A1 Mini, P1P, P1S, X1 og X1 Carbon, fordi
kompatibilitetsudvikling har brug for rigtige modeller at arbejde med.

Kunden kan gemme sine printere — i localStorage som gæst, på kontoen når
man er logget ind — og produktsider viser derefter, om varen passer.

## Kompatibilitet

Fire tilstande, ikke to:

| Status         | Vises som                                                                  |
| -------------- | -------------------------------------------------------------------------- |
| `compatible`   | ✓ Passer til din printer                                                   |
| `incompatible` | Passer ikke til din printer                                                |
| `conditional`  | Passer med forbehold — plus noten, fx "Kræver hærdet dyse på Bambu Lab A1" |
| `unknown`      | Kompatibilitet ikke bekræftet                                              |

`unknown` er standard, når der ikke findes en regel. Det er hele pointen: en
butik, der påstår "passer til din printer", fordi den ikke ved bedre, er en
butik, der sender returvarer. En `conditional` regel skal have en note — uden
den er forbeholdet ubrugeligt.

Regler kan sættes på produkt- eller variantniveau mod en printermodel.

## Den guidede vælger

`/find-filament` stiller fire spørgsmål — printer, hvad skal printes, hvad er
vigtigst, farve — og svarer med 3-6 produkter, hver med en begrundelse.

Motoren er regelbaseret (`packages/commerce/src/recommendation/`). Regler
scorer produkter og returnerer _hvorfor_ de scorede, ikke bare hvor meget.
Begrundelserne er det, kunden ser. Grænsefladen tager en liste af regler ind,
så en AI-baseret scorer kan lægges ved siden af uden at skrive systemet om.

Lagerstatus indgår: et produkt, der ikke kan købes, anbefales ikke som
førstevalg.

## Kostpris

Gemmes på varianten, vises **aldrig** på storefronten — hverken i HTML, i
JSON-svar eller i RSC-payloadet. Admin ser salgspris, indkøbspris,
dækningsbidrag og margin, og de tre sidste beregnes centralt i
`packages/commerce/src/pricing.ts`:

```
189 kr salg − 102 kr indkøb = 87 kr dækningsbidrag = 46 % margin
```

## CSV-import

Kolonner: `sku`, `ean`, `stock`, `cost_price`, `sale_price`.

Priserne er i **kroner**, ikke øre — filen skrives i Excel af et menneske, og
`102,50` er det, de taster. Parseren accepterer dansk decimalkomma og
tusindtalsseparator (`1.250,00`); internt bliver alt til øre med det samme.

Parseren følger RFC 4180 — citationstegn, escaped citationstegn, semikolon
til dansk Excel, BOM. Hele filen valideres, **før** noget skrives, og
importen viser en preview:

```
129 varer fundet · 118 opdateres · 8 uændrede · 3 fejl
```

Der er ingen delvise, tavse fejl. Hver eneste række ender i præcis én af de
fire kategorier — det er en af de 20 tests. Fejler en række, importeres den
ikke, og fejlen står i previewet med linjenummer.
