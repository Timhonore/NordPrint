import { commerceConfig, siteConfig } from "@nordprint/config";
import { formatMoney, money } from "@nordprint/commerce";

/**
 * Static information pages — the ones every Danish webshop is required or
 * expected to have.
 *
 * They live in code rather than the CMS because they change rarely and
 * because a broken privacy policy must not be one editor mistake away. The
 * guides, which *are* editorial content, live in the backend.
 *
 * Anything company-specific (CVR, address, e-mail, the free-shipping
 * threshold) is interpolated from configuration. Placeholders that a real
 * launch must replace are marked `[udfyldes]` so they are impossible to miss
 * — never invented.
 */

export interface InfoSection {
  readonly heading: string;
  readonly body: readonly string[];
}

export interface InfoPage {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly lead: string;
  readonly label: string;
  readonly sections: readonly InfoSection[];
  /** Shown at the bottom: "Sidst opdateret". */
  readonly updated: string;
}

const threshold = formatMoney(
  money(commerceConfig.shipping.freeShippingThreshold, commerceConfig.currency)
);
const standardRate = formatMoney(
  money(commerceConfig.shipping.defaultRate, commerceConfig.currency)
);
const address = `${siteConfig.address.street}, ${siteConfig.address.postalCode} ${siteConfig.address.city}`;

export const infoPages: readonly InfoPage[] = [
  {
    slug: "kontakt",
    title: "Kontakt",
    label: "Kundeservice",
    description: `Skriv til ${siteConfig.supportEmail} eller ring — vi svarer på dansk, og vi printer selv.`,
    lead: "Vi svarer normalt samme hverdag. Har du et print, der driller, må du meget gerne sende et billede med — det er tit hurtigere end en beskrivelse.",
    sections: [
      {
        heading: "Skriv til os",
        body: [
          `E-mail: ${siteConfig.supportEmail}`,
          `Telefon: ${siteConfig.supportPhone}`,
          "Telefonen er åben på hverdage. Uden for åbningstiden er e-mail hurtigst.",
        ],
      },
      {
        heading: "Spørgsmål om en ordre",
        body: [
          "Har du et ordrenummer, så skriv det i første linje. Så kan vi slå ordren op med det samme i stedet for at spørge om den.",
          "Du kan altid se status på dine ordrer under Min konto → Ordrer.",
        ],
      },
      {
        heading: "Firmaoplysninger",
        body: [`NordPrint`, address, `CVR: ${siteConfig.cvr}`],
      },
    ],
    updated: "Denne side vedligeholdes manuelt.",
  },
  {
    slug: "levering",
    title: "Levering",
    label: "Fragt",
    description:
      "Pakkeshop, hjemmelevering og erhvervslevering i Danmark. Fri fragt over " + threshold + ".",
    lead: `Vi sender fra eget lager i Danmark. Bestiller du inden kl. 14 på en hverdag, pakker vi som udgangspunkt samme dag.`,
    sections: [
      {
        heading: "Priser",
        body: [
          `Fragt koster fra ${standardRate}. Den præcise pris afhænger af leveringsform og vægt, og du ser den, før du betaler.`,
          `Fri fragt ved køb over ${threshold}.`,
        ],
      },
      {
        heading: "Leveringsformer",
        body: [
          "Pakkeshop: du henter pakken i en pakkeshop, du vælger under checkout.",
          "Hjemmelevering: pakken leveres på adressen.",
          "Erhvervslevering: levering til en virksomhedsadresse inden for normal arbejdstid.",
        ],
      },
      {
        heading: "Leveringstid",
        body: [
          "Pakker afsendt på en hverdag er typisk fremme 1–3 hverdage efter afsendelse. Fragtfirmaet står for selve transporten, og deres tider kan svinge omkring højtider og udsalg.",
          "Du får et track & trace-link i e-mailen, når pakken er afsendt.",
        ],
      },
      {
        heading: "Forsinkede pakker",
        body: [
          `Er pakken ikke kommet, når den burde, så skriv til ${siteConfig.supportEmail} med ordrenummeret. Vi undersøger det hos fragtfirmaet — du skal ikke selv gøre det.`,
        ],
      },
    ],
    updated: "Denne side vedligeholdes manuelt.",
  },
  {
    slug: "returnering",
    title: "Returnering & fortrydelsesret",
    label: "Returnering",
    description:
      "14 dages fortrydelsesret efter de danske forbrugerregler. Sådan sender du varen retur.",
    lead: "Du har 14 dages fortrydelsesret fra den dag, du modtager varen. Fortryder du, skal du give os besked inden fristen udløber — og sende varen tilbage senest 14 dage efter det.",
    sections: [
      {
        heading: "Sådan fortryder du",
        body: [
          `Skriv til ${siteConfig.supportEmail} med ordrenummer og hvilke varer det drejer sig om. Du behøver ikke begrunde det.`,
          "Vi sender en kvittering for, at vi har modtaget din besked, og forklarer, hvordan du sender varen retur.",
        ],
      },
      {
        heading: "Varens stand",
        body: [
          "Du må gerne åbne emballagen og undersøge varen, som du ville have gjort i en fysisk butik. Har du brugt den mere end det, kan vi trække værdiforringelsen fra i beløbet.",
          "Filament, der er taget ud af sin forseglede pose, kan have optaget fugt. Det tæller som brug — så lad posen være lukket, indtil du er sikker.",
        ],
      },
      {
        heading: "Penge retur",
        body: [
          "Vi refunderer beløbet med den betalingsmetode, du brugte, senest 14 dage efter vi har modtaget varen retur eller dokumentation for, at den er sendt.",
          "Returfragten betaler du selv, medmindre varen var defekt eller forkert leveret.",
        ],
      },
      {
        heading: "Reklamation",
        body: [
          "Ud over fortrydelsesretten har du 2 års reklamationsret efter købeloven, hvis der er noget galt med varen. Kontakt os, så finder vi ud af det.",
          "Er du ikke enig i vores afgørelse, kan du klage til Nævnenes Hus, Toldboden 2, 8800 Viborg — naevneneshus.dk.",
        ],
      },
    ],
    updated: "Denne side vedligeholdes manuelt.",
  },
  {
    slug: "handelsbetingelser",
    title: "Handelsbetingelser",
    label: "Betingelser",
    description: "Vilkårene for handel på nordprint.dk.",
    lead: "Disse betingelser gælder for alle køb på nordprint.dk. Er du forbruger, gælder de danske forbrugerregler altid forud for det, der står her.",
    sections: [
      {
        heading: "Sælger",
        body: [
          `NordPrint`,
          address,
          `CVR: ${siteConfig.cvr}`,
          `E-mail: ${siteConfig.supportEmail}`,
        ],
      },
      {
        heading: "Priser og betaling",
        body: [
          `Alle priser er i danske kroner og inklusive ${Math.round(commerceConfig.vatRate * 100)} % moms.`,
          "Vi trækker beløbet, når varen sendes — ikke når du bestiller.",
          "Vi tager forbehold for tastefejl, prisfejl og udsolgte varer. Er en pris åbenlyst forkert, kontakter vi dig i stedet for at gennemføre ordren.",
        ],
      },
      {
        heading: "Aftalens indgåelse",
        body: [
          "En ordre er bindende, når du har modtaget vores ordrebekræftelse på e-mail. Kan vi ikke levere, annullerer vi ordren og refunderer beløbet.",
        ],
      },
      {
        heading: "Levering",
        body: [
          "Se siden Levering for fragtpriser, leveringsformer og leveringstider.",
          "Risikoen for varen overgår til dig, når du eller nogen på dine vegne har modtaget den.",
        ],
      },
      {
        heading: "Fortrydelse og reklamation",
        body: ["Se siden Returnering & fortrydelsesret."],
      },
      {
        heading: "Persondata",
        body: ["Se Privatlivspolitik for hvordan vi behandler dine oplysninger."],
      },
      {
        heading: "Værneting og lovvalg",
        body: [
          "Køb på nordprint.dk er underlagt dansk ret. Tvister afgøres ved de danske domstole.",
        ],
      },
    ],
    updated: "Denne side vedligeholdes manuelt.",
  },
  {
    slug: "privatliv",
    title: "Privatlivspolitik",
    label: "Persondata",
    description: "Hvilke oplysninger vi behandler, hvorfor — og hvad du kan bede os om.",
    lead:
      "Vi behandler kun de oplysninger, vi har brug for til at sende dig en pakke og hjælpe dig bagefter. Dataansvarlig er NordPrint, " +
      address +
      ", CVR " +
      siteConfig.cvr +
      ".",
    sections: [
      {
        heading: "Hvad vi behandler",
        body: [
          "Ved køb: navn, adresse, e-mail, telefonnummer og hvad du har købt. Det er nødvendigt for at opfylde aftalen.",
          "Ved konto: e-mail, adgangskode i krypteret form, dine gemte adresser, printere og favoritter.",
          "Ved nyhedsbrev: din e-mail, indtil du framelder dig.",
          "Vi modtager aldrig dine fulde kortoplysninger. De går direkte til betalingsudbyderen.",
        ],
      },
      {
        heading: "Hvem vi deler med",
        body: [
          "Fragtfirmaet, så pakken kan leveres.",
          "Betalingsudbyderen, så betalingen kan gennemføres.",
          "Vores hosting- og e-mailleverandører som databehandlere. De må kun behandle data efter vores instruks.",
          "Vi sælger aldrig dine oplysninger.",
        ],
      },
      {
        heading: "Hvor længe",
        body: [
          "Bogføringsmateriale gemmer vi i 5 år plus indeværende regnskabsår, som bogføringsloven kræver.",
          "Kontooplysninger gemmer vi, indtil du beder os slette kontoen.",
          "Nyhedsbrevstilmeldinger gemmer vi, indtil du framelder dig.",
        ],
      },
      {
        heading: "Dine rettigheder",
        body: [
          "Du kan bede om indsigt i, berigtigelse af eller sletning af dine oplysninger, og du kan bede om at få dem udleveret i et maskinlæsbart format.",
          "Er du logget ind, kan du hente dine data og bede om sletning under Min konto → Profil.",
          `Ellers skriver du til ${siteConfig.supportEmail}. Vi svarer inden for en måned.`,
          "Du kan klage til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby — datatilsynet.dk.",
        ],
      },
    ],
    updated: "Denne side vedligeholdes manuelt.",
  },
  {
    slug: "cookies",
    title: "Cookies",
    label: "Cookies",
    description: "Hvilke cookies vi bruger, og hvordan du ændrer dit valg.",
    lead: "Vi sætter kun de cookies, der skal til for at butikken virker, medmindre du aktivt siger ja til mere. Du kan altid ændre dit valg nederst på denne side.",
    sections: [
      {
        heading: "Nødvendige cookies",
        body: [
          "Disse kan ikke fravælges — uden dem kan du hverken lægge i kurv eller logge ind.",
          "nordprint_cart_id: holder styr på din kurv. Udløber efter 30 dage.",
          "nordprint_region_id: husker hvilken region og valuta du handler i.",
          "nordprint_consent: husker dit cookievalg, så vi ikke spørger igen. Udløber efter 180 dage.",
          "Login-cookies fra Medusa, når du er logget ind.",
        ],
      },
      {
        heading: "Statistik",
        body: [
          "Bruges til at se, hvilke sider der bliver læst, og hvor noget går galt. Sættes kun, hvis du siger ja.",
          "Vi sætter ingen statistik-cookies, før du har givet samtykke — heller ikke i en 'anonym' variant.",
        ],
      },
      {
        heading: "Markedsføring",
        body: ["Bruges til at måle effekten af annoncer. Sættes kun, hvis du siger ja."],
      },
      {
        heading: "Ændr dit valg",
        body: [
          "Brug knappen nedenfor. Fjerner du samtykket, holder vi op med at sætte de pågældende cookies med det samme.",
        ],
      },
    ],
    updated: "Denne side vedligeholdes manuelt.",
  },
  {
    slug: "om-nordprint",
    title: "Om NordPrint",
    label: "Om os",
    description: "Hvem vi er, og hvorfor vi driver en filamentbutik.",
    lead: "NordPrint er en dansk webshop for 3D-print. Vi sælger filament, reservedele og udstyr — og vi bruger selv det meste af det, vi sælger.",
    sections: [
      {
        heading: "Hvorfor vi findes",
        body: [
          "Det er svært at købe filament, når produktsiden ikke fortæller dig, hvad spolen vejer, om materialet er slibende, eller om det overhovedet passer i din printer.",
          "Så vi skriver det. Hver eneste filamentside har dysetemperatur, bedtemperatur, tørring, spolevægt og pris pr. kg — så du kan sammenligne, før du køber.",
        ],
      },
      {
        heading: "Lager i Danmark",
        body: [
          `Vi pakker og sender selv fra ${siteConfig.address.city}. Det betyder korte leveringstider og at der sidder et menneske i den anden ende, når noget går galt.`,
        ],
      },
      {
        heading: "Kontakt",
        body: [
          `E-mail: ${siteConfig.supportEmail}`,
          `Telefon: ${siteConfig.supportPhone}`,
          address,
          `CVR: ${siteConfig.cvr}`,
        ],
      },
    ],
    updated: "Denne side vedligeholdes manuelt.",
  },
];

export function findInfoPage(slug: string): InfoPage | undefined {
  return infoPages.find((page) => page.slug === slug);
}
