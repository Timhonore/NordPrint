/**
 * Guide seed content.
 *
 * Written for this repository. The point of the guides is that NordPrint is a
 * knowledge platform as well as a shop — a customer who understands why their
 * PETG strings buys the dryer for the right reason.
 */
export const SEED_GUIDES = [
  {
    slug: "pla-vs-petg",
    title: "PLA eller PETG — hvad skal du vælge?",
    intro:
      "De to mest brugte materialer løser hver sin opgave. Her er den korte version, " +
      "så du ikke køber en rulle, der ikke passer til det, du skal bruge den til.",
    author: "NordPrint",
    tags: ["materialer", "begynder"],
    seoTitle: "PLA eller PETG? Guide til at vælge det rigtige filament",
    seoDescription:
      "PLA er nemmest at printe, PETG er sejere og tåler sol og varme. Sådan vælger du.",
    relatedGuideSlugs: ["filament-toerring"],
    content: `## Den korte version

Vælg **PLA** hvis delen skal se godt ud, printes hurtigt og bliver indendørs.
Vælg **PETG** hvis delen skal holde til at blive skruet i, ligge i en bil eller stå udenfor.

## Hvor de adskiller sig

| | PLA | PETG |
|---|---|---|
| Printvenlighed | Meget nem | Nem, men strenger |
| Varmebestandighed | ca. 55 °C | ca. 75 °C |
| UV-bestandighed | Lav | God |
| Sejhed | Sprødt — knækker | Sejt — bøjer |
| Dysetemperatur | 190-230 °C | 230-260 °C |
| Bedtemperatur | 35-60 °C | 70-85 °C |

## Det, folk oftest tager fejl af

**"PLA er svagt."** Det passer ikke. PLA har faktisk højere trækstyrke end PETG.
Forskellen er, at PLA er *sprødt*: det knækker pludseligt, mens PETG bøjer først.
Til et beslag, der bliver spændt, vinder PETG. Til en hylde, der bare skal bære, er PLA fint.

**"PLA tåler ikke varme."** Det passer. En PLA-del i en bil om sommeren bliver blød.
Det er den vigtigste enkeltgrund til at vælge PETG.

**PETG strenger.** Det er normalt. Tør rullen, sæt temperaturen 5-10 °C ned og
skru retraction lidt op. Fugt er årsagen langt oftere end indstillingerne.

## Hvornår ingen af dem er svaret

Skal delen kunne bøje og fjedre tilbage, skal du bruge TPU.
Skal den stå ude året rundt i sol, er ASA bedre end begge.
Skal den holde til rigtige mekaniske kræfter, er nylon med kulfiber vejen.`,
  },

  {
    slug: "filament-toerring",
    title: "Tørring af filament: hvornår, hvor længe og hvorfor",
    intro:
      "Fugt er den mest oversete årsag til dårlige prints. Her er hvordan du opdager " +
      "det, og hvad du gør ved det.",
    author: "NordPrint",
    tags: ["vedligeholdelse", "kvalitet"],
    seoTitle: "Tør dit filament rigtigt — temperaturer og tider",
    seoDescription:
      "Poppende lyde, strenge og ru overflader skyldes oftest fugt. Se tørretider pr. materiale.",
    relatedGuideSlugs: ["pla-vs-petg"],
    content: `## Sådan hører du det

Fugtigt filament siger **pop** og **knitren**, når vandet fordamper i dysen.
Kommer der damp ud, er der ingen tvivl.

De andre tegn:

- Ru, matte overflader hvor de plejer at være blanke
- Strenge overalt, selv med retraction, der plejede at virke
- Dele, der delaminerer langs lagene ved lille belastning
- Synlige bobler i den ekstruderede streng

## Tørretider

| Materiale | Temperatur | Tid |
|---|---|---|
| PLA | 55 °C | 6 timer |
| PETG | 65 °C | 8 timer |
| ASA / ABS | 70 °C | 8 timer |
| TPU | 70 °C | 10 timer |
| Nylon (PA) | 80 °C | 12 timer |

Nylon er i en klasse for sig: det suger målbart fugt på **få timer** i almindelig
dansk indendørsluft. Skal du printe nylon, skal du printe direkte fra tørreren.

## Brug ikke ovnen

En almindelig husholdningsovn kan ikke holde 55 °C stabilt — termostaten svinger
typisk ±15 °C. En spole, der får 80 °C i ti minutter, er ikke tør, den er deform.
Spolen klemmer sig sammen, filamentet binder til sig selv, og resten af rullen er tabt.

## Opbevaring bagefter

Tørring holder ikke, hvis rullen ligger frit fremme bagefter.
Lufttæt boks med tørremiddel og en fugtindikator, du faktisk kigger på.
Under 20 % relativ fugtighed er målet.`,
  },

  {
    slug: "bambu-ams",
    title: "AMS og AMS Lite: hvad kan de, og hvad kan de ikke",
    intro:
      "Automatisk materialeskift er praktisk — men ikke alt filament kan køre i en AMS. " +
      "Her er, hvad du skal holde øje med.",
    author: "NordPrint",
    tags: ["bambu-lab", "udstyr"],
    seoTitle: "Bambu AMS og AMS Lite — kompatibilitet og faldgruber",
    seoDescription:
      "Hvilke materialer kan køre i AMS, hvad koster flerfarveprint i spild, og hvad skal du undgå.",
    relatedGuideSlugs: ["filament-toerring", "pla-vs-petg"],
    content: `## Forskellen

**AMS** sidder på P1- og X1-serien. Lukket kabinet med plads til tørremiddel,
fire spoler, og filamentet føres gennem en hub.

**AMS Lite** sidder på A1-serien. Åben konstruktion, fire spoler, ingen
tørremiddelrum. Den holder altså ikke filamentet tørt — det skal du selv gøre.

## Hvad der ikke kører i en AMS

- **TPU og andre bløde materialer.** Den bløde streng bukker i stedet for at
  blive skubbet frem. Kør TPU direkte fra en ekstern holder.
- **Pap-spoler med skarpe kanter.** Papstøv samler sig i mekanikken.
- **Filament med løse viklinger.** En streng, der er smuttet under en anden,
  låser og giver en fejl midt i et 14-timers print. Rul om, hvis du er i tvivl.

## Spild ved flerfarveprint

Hvert farveskift renser dysen. Ved mange skift pr. lag går der reelt mere
filament til purge end til modellen. Det er ikke en fejl — det er sådan
teknikken virker.

Vil du skære ned:

- Læg farveskift så få steder i højden som muligt
- Brug purge-objektet som noget nyttigt frem for at smide det ud
- Overvej at printe delene enkeltvis i hver sin farve og samle bagefter

## Slibende filament

Kulfiber og glasfiber slider den almindelige dyse op. Med AMS bliver det værre,
fordi filamentet også passerer gennem hub og PTFE-slanger. Skift til hærdet dyse,
og hold øje med slangerne.`,
  },
];
