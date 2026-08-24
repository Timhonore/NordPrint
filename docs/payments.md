# Betaling

## Princippet

Betaling er en grænseflade, ikke en leverandør. Medusas
`AbstractPaymentProvider` definerer de operationer, butikken har brug for —
initiate, authorize, capture, cancel, refund, status og webhooks — og hver
udbyder implementerer dem. Checkout-koden kender ingen udbyder ved navn.

Det gør to ting mulige: at skifte udbyder uden at røre checkout, og at køre
hele butikken i udvikling uden en eneste aftale.

## Hvad der er implementeret

| Udbyder                     | Status                                                                           | Fil                                             |
| --------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Vipps MobilePay**         | Fuldt implementeret mod ePayment API v1. Kræver aftale og nøgler.                | `apps/commerce/src/modules/payment-mobilepay`   |
| **Udvikling**               | Simulerer et godkendt flow. Registreres **kun** når `NODE_ENV !== "production"`. | `apps/commerce/src/modules/payment-development` |
| Kort, Apple Pay, Google Pay | Ikke implementeret. Grænsefladen er der; udbyderen er ikke valgt.                | —                                               |

Der er **ingen sti, hvor produktionstilstand viser "betaling gennemført" uden
en rigtig betaling.** Udviklings-udbyderen registreres ikke i produktion, og
`medusa-config.ts` afviser at starte, hvis den skulle være det.

## Vipps MobilePay ePayment

Implementeringen bruger **ePayment API v1** — ikke det gamle eCom-API. Det er
værd at være eksplicit om, fordi der ligger mange eksempler online på det
deprecated API, og de ser ud til at virke.

```
POST /accesstoken/get                        → token (cachet til lige før udløb)
POST /epayment/v1/payments                   → redirectUrl, reference
GET  /epayment/v1/payments/{ref}             → status
POST /epayment/v1/payments/{ref}/capture     → hæv beløbet
POST /epayment/v1/payments/{ref}/cancel      → annullér reservationen
POST /epayment/v1/payments/{ref}/refund      → refundér
```

Detaljer, der betyder noget:

- **Idempotency-Key på alle ændrende kald.** Et gentaget capture-kald med
  samme nøgle hæver ikke pengene to gange. Nøglen udledes af Medusas
  betalingssession, ikke af et tilfældigt tal, så et genforsøg genbruger den.
- **Status læses altid tilbage fra udbyderen.** Kunden kommer tilbage fra
  MobilePay via en returadresse, vi ikke kontrollerer. At kunden landede på
  kvitteringssiden betyder ikke, at der er betalt — så vi spørger Vipps.
- **Beløb sendes i mindste enhed** med valuta, som API'et kræver.
- **Capture ved afsendelse, ikke ved bestilling.** Reservationen laves ved
  køb; pengene hæves, når varen sendes. Det er både korrekt og det, danske
  kunder forventer.

### Nøgler

```bash
VIPPS_MOBILEPAY_CLIENT_ID=
VIPPS_MOBILEPAY_CLIENT_SECRET=
VIPPS_MOBILEPAY_SUBSCRIPTION_KEY=
VIPPS_MOBILEPAY_MSN=                    # merchant serial number
VIPPS_MOBILEPAY_API_URL=https://apitest.vipps.no    # produktion: https://api.vipps.no
VIPPS_MOBILEPAY_RETURN_URL=https://nordprint.dk/checkout/retur
```

Uden dem registreres MobilePay ikke som betalingsmetode. Der falder ikke
tilbage på en stub, og der vises ikke en knap, der ikke virker.

## Betalingsstatus og fulfillment-status

De er adskilt, og de skal blive ved med at være det.

| Betaling                                                | Fulfillment                                       |
| ------------------------------------------------------- | ------------------------------------------------- |
| Afventer · Reserveret · Hævet · Annulleret · Refunderet | Modtaget · Behandles · Pakkes · Afsendt · Leveret |

En ordre kan være betalt og ikke afsendt, eller afsendt og delvist
refunderet. At blande dem sammen i ét felt er den fejl, der senere gør det
umuligt at svare på "har vi fået pengene?".

Kundens ordrestatus er en visning af begge, ikke et tredje felt.

## Før butikken kan tage imod rigtige penge

Det her mangler. Ikke i koden — i aftaler og opsætning.

1. **Aftale med Vipps MobilePay** og nøgler til produktions-API'et.
2. **Webhook registreret** hos Vipps mod `/hooks/payment/mobilepay`, så en
   betaling, der bekræftes efter kunden har lukket browseren, stadig
   registreres.
3. **Kortbetaling valgt og implementeret.** Grænsefladen findes; udbyderen
   gør ikke. Apple Pay og Google Pay kommer typisk med kortudbyderen.
4. **Testkøb i produktion** med et rigtigt, lille beløb — inklusive
   refundering. Et betalingsflow er ikke afprøvet, før pengene er kommet
   tilbage igen.
5. **Afstemning** mellem Medusas ordrer og udbyderens afregning.

## Hvad der aldrig må logges

Ikke kortnumre, ikke CVV, ikke access tokens, ikke autorisationsheadere, ikke
komplette request-bodies fra betalingsudbydere. Loggen indeholder
betalingsreference, beløb, valuta, status og fejlkode — nok til at fejlsøge,
ikke nok til at misbruge.
