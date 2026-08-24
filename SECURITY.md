# Sikkerhed

## Rapportér en sårbarhed

Skriv til **sikkerhed@nordprint.dk**. Opret ikke et offentligt issue.

Skriv hvad du fandt, hvordan det reproduceres, og hvad du vurderer
konsekvensen er. Du får svar inden for 3 hverdage.

Vi beder om, at du ikke tilgår andres data, ikke ændrer eller sletter noget,
og ikke kører belastningstest mod produktion. Til gengæld går vi ikke rettens
vej mod nogen, der finder og rapporterer i god tro.

## Valgene, der er truffet

### Adgang

Admin er aldrig offentligt tilgængelig uden authentication. Autorisation
håndhæves på serveren; klientsiden skjuler kun noget, den ikke i forvejen har.
Der findes ikke et sted, hvor en manglende rettighed opdages i browseren.

Sessioner ligger i httpOnly-cookies. Kundens JWT læses kun på serveren — et
token i `localStorage` er et token, ethvert script på siden kan tage.
`Secure` sættes automatisk i produktion, hvor forbindelsen kommer gennem Caddy
over HTTPS. `SameSite=Lax` på kurv- og sessions-cookies.

Login-fejl siger det samme, uanset om e-mailen findes. Oprettelse af en konto
med en allerede kendt e-mail svarer heller ikke "den findes" — begge dele ville
være en gratis brugernavnsliste for den, der spørger.

Login siden accepterer kun `retur`-adresser på samme site. Et åbent redirect
på en loginside er, hvordan et phishing-link kommer til at bære vores domæne.

CORS er en whitelist, ikke en jokertegn. `STORE_CORS`, `ADMIN_CORS` og
`AUTH_CORS` skal matche de rigtige domæner i produktion — en for bred liste
er en åben dør til API'et.

### Netværk

PostgreSQL og Redis er ikke eksponeret. De ligger på et Docker-netværk med
`internal: true`, som hverken kan nås udefra eller selv kan nå internettet.
Applikationscontainerne ligger på begge netværk, fordi de skal kunne kalde
betalings- og fragtudbydere. Kun Caddy publicerer porte.

Worker-containeren har ingen offentlig port overhovedet.

### Hemmeligheder

Ingen hemmeligheder i koden, i workflow-filer eller i images. Alt kommer fra
miljøvariabler; `.env` er i `.gitignore`. Deploy-nøglen ligger i GitHub
Secrets og skrives kun til runnerens efemere disk.

`medusa-config.ts` nægter at starte i produktion uden `JWT_SECRET`,
`COOKIE_SECRET`, `DATABASE_URL`, `REDIS_URL`, `S3_BUCKET` og CORS. Bedre at
fejle ved opstart end at køre videre i en tilstand, ingen havde tænkt sig.

`NEXT_PUBLIC_`-præfikset bruges kun til værdier, der _må_ stå i klientens
bundt. Den publishable key har det bevidst ikke: kun serveren bruger den, og
så kan den skiftes uden en ny build.

### Input og rater

Alt input valideres på serveren — også det, en klientside allerede har
valideret. Følsomme endepunkter (login, oprettelse, nulstilling af kodeord,
nyhedsbrev) er rate limitede.

Markdown renderes af en egen renderer, der bygger React-elementer — den
kender kun de elementer, den skal, og begrænser links til http(s) og relative
adresser. Der er ingen sti fra redaktionelt indhold til rå HTML.

`dangerouslySetInnerHTML` bruges ét sted: JSON-LD til schema.org. Det går
gennem `serializeJsonLd`, som escaper `<`, `>`, U+2028 og U+2029, fordi
`JSON.stringify` ikke gør det — og et produktnavn med `</script>` ville
ellers kunne lukke tagget. Escapingen er dækket af tests.

### Sikkerhedsheaders

Caddy sætter HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin` og en `Permissions-Policy`,
der slår geolocation, mikrofon, kamera og FLoC fra.

### Logning

Følsomme data logges ikke. Aldrig: adgangskoder, betalingsoplysninger,
autorisationstokens, komplette kortdata, fulde request-bodies fra
betalingsudbydere.

Fejl fra backenden oversættes til en dansk besked, før kunden ser dem. Den
tekniske årsag logges struktureret på serveren. En kunde, der får
"A valid publishable key is required to proceed with the request" at vide,
lærer ingenting — og en angriber lærer noget.

### GDPR

Analytics- og markedsføringscookies antages ikke accepteret. De sættes først,
når kunden aktivt har sagt ja, og "Kun nødvendige" er lige så synlig som
"Accepter alle". Samtykket er versioneret og udløber efter 180 dage.

Kunden kan selv hente sine data og bede om sletning under Min konto → Profil.
Eksporten samles i backenden, fordi kun den kender alle moduler, der gemmer
persondata, og den serveres med `no-store` — det er den mest personlige
payload, API'et producerer.

Sletning er bevidst en _anmodning_. Bogføringsloven kræver fakturaer i fem år,
så ordrehistorik skal anonymiseres frem for at forsvinde, og det er en
vurdering, et menneske træffer. Anmodningen gemmes på kundens egen record, så
den overlever en genstart og ikke kan blive væk i en kø, ingen kigger i.

Vi indsamler ikke oplysninger, vi ikke har brug for.

### Afhængigheder

`pnpm install --frozen-lockfile` i CI: der bygges præcis det, der er
committet — ikke det nyeste, der tilfældigvis findes i dag.

## Før produktion

- [ ] `JWT_SECRET` og `COOKIE_SECRET` genereret med `openssl rand -base64 48`
- [ ] Alle standardadgangskoder i `.env` skiftet
- [ ] CORS sat til de rigtige domæner
- [ ] `NEXT_PUBLIC_ALLOW_INDEXING=true` kun på produktionsdomænet
- [ ] Off-site backup opsat og gendannelsen afprøvet
- [ ] `SENTRY_DSN` sat, så fejl ikke kun ender i stdout
- [ ] Admin-brugere oprettet med hver deres konto — ingen delte logins
- [ ] Firewall: kun 80, 443 og SSH
