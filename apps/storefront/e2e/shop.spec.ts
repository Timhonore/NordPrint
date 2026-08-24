import { expect, test } from "@playwright/test";

/**
 * The paths that must never break.
 *
 * These cover the journey a customer actually takes — find a product, pick a
 * colour, add it to the cart, reach checkout — plus the promises the brief
 * makes about price per kg, sold-out colours and compatibility.
 *
 * Deliberately not exhaustive: e2e tests are slow and brittle, so they are
 * spent on the flows where a regression costs money.
 */

test.describe("Forsiden", () => {
  test("viser hero, kategorier og produkter", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Alt til dit næste print");
    await expect(page.getByRole("link", { name: "Shop filament" }).first()).toBeVisible();

    // USP'erne kommer fra konfiguration, ikke fra markup.
    await expect(
      page.getByRole("region", { name: "Derfor NordPrint" }).getByText("Lager i Danmark")
    ).toBeVisible();
  });

  test("har ingen vandret scroll på 360 px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobil-360", "Kun relevant på den smalle viewport.");

    await page.goto("/");

    // Vandret scroll på mobil er den mest almindelige layoutfejl, og den er
    // usynlig for den, der udvikler på en bred skærm.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflows).toBe(false);
  });
});

/**
 * Hele butikken på en telefon.
 *
 * Den her findes, fordi ovenstående test kun dækkede forsiden — og
 * /konto/log-ind skubbede siden 157 px ud, uden at nogen opdagede det.
 * Et enkelt grid-barn uden `min-w-0` er nok, og fejlen er usynlig på en
 * bred skærm.
 */
test.describe("Mobil", () => {
  const RUTER = [
    "/",
    "/filament",
    "/filament/pla",
    "/produkter",
    "/produkt/nordprint-pla-basic",
    "/kurv",
    "/checkout",
    "/find-filament",
    "/sammenlign",
    "/soeg?q=pla",
    "/reservedele",
    "/tilbehoer",
    "/guides",
    "/tilbud",
    "/shop-efter-printer",
    "/konto",
    "/konto/log-ind",
    "/konto/ordrer",
    "/konto/favoritter",
    "/levering",
    "/kontakt",
    "/privatliv",
  ];

  test("ingen side skubber layoutet ud til siden", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobil-360", "Kun relevant på den smalle viewport.");

    const brudte: string[] = [];

    for (const rute of RUTER) {
      await page.goto(rute, { waitUntil: "domcontentloaded" });

      // Nogle ruter omdirigerer (tom kurv → /kurv, /konto → login), og en
      // måling midt i en navigation river konteksten væk under sig.
      await page.waitForLoadState("load");
      await expect(page.locator("main")).toBeVisible();

      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      if (over > 1) brudte.push(`${rute} (+${over}px)`);
    }

    expect(brudte, `Vandret overløb: ${brudte.join(", ")}`).toEqual([]);
  });

  test("hjertet på et produktkort er stort nok til en tommelfinger", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobil-360", "Kun relevant på den smalle viewport.");

    await page.goto("/filament");

    // WCAG 2.2 sætter grænsen ved 24 px, Apple og Google anbefaler 44.
    // Et hjerte, man rammer ved siden af, gemmer den forkerte vare.
    const knap = page.getByRole("button", { name: /som favorit/i }).first();
    const box = await knap.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });
});

test.describe("Katalog", () => {
  test("filtrerer i URL'en og kan deles", async ({ page }) => {
    await page.goto("/filament");

    const total = page.getByRole("status");
    await expect(total).toBeVisible();

    // Et filter er et rigtigt link: det ændrer URL'en og kan bogmærkes.
    await page.goto("/filament?material=pla");
    await expect(page).toHaveURL(/material=pla/);
    await expect(page.getByText("Aktive filtre:")).toBeVisible();

    const cards = page.locator("article");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("viser pris pr. kg", async ({ page }) => {
    await page.goto("/filament");
    // Pris/kg er hele grunden til, at man kan sammenligne en 750 g-spole med
    // en på 1 kg. Den skal stå på kortene.
    await expect(page.locator("text=/kr\\/kg/").first()).toBeVisible();
  });

  test("sorterer efter pris pr. kg", async ({ page }) => {
    await page.goto("/filament?sort=price_per_kg_asc");
    await expect(page).toHaveURL(/sort=price_per_kg_asc/);
    expect(await page.locator("article").count()).toBeGreaterThan(0);
  });
});

test.describe("Produktside", () => {
  test("viser datablad og farvevælger", async ({ page }) => {
    await page.goto("/produkt/nordprint-pla-basic");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("PLA Basic");

    // Farvevælgeren er en radiogroup, ikke en dropdown.
    const swatches = page.getByRole("radiogroup", { name: /farve/i });
    await expect(swatches).toBeVisible();
    expect(await swatches.getByRole("radio").count()).toBeGreaterThan(1);

    // Printindstillingerne fra kravspecifikationen.
    await expect(page.getByText("Printindstillinger").first()).toBeVisible();
    await expect(page.getByText("190–230 °C")).toBeVisible();
    await expect(page.getByText("55 °C / 6 timer")).toBeVisible();

    await expect(page.getByText("Printvenlighed").first()).toBeVisible();
  });

  test("farvevalg opdaterer URL'en", async ({ page }) => {
    await page.goto("/produkt/nordprint-pla-basic");

    const swatches = page.getByRole("radiogroup", { name: /farve/i });
    await swatches.getByRole("radio").nth(1).click();

    // Valget skal kunne deles som et link.
    await expect(page).toHaveURL(/farve=/);
  });

  test("udsolgte farver er stadig synlige", async ({ page }) => {
    await page.goto("/produkt/nordprint-pla-basic");

    // Skovgrøn er seedet som udsolgt. Den skal blive stående, så kunden kan
    // se at farven findes — ikke skjules.
    const swatches = page.getByRole("radiogroup", { name: /farve/i });
    await expect(swatches.getByRole("radio", { name: /udsolgt/i }).first()).toBeVisible();
  });
});

test.describe("Kurv", () => {
  test("læg i kurv og videre til checkout", async ({ page }) => {
    await page.goto("/produkt/nordprint-pla-basic");

    await page.getByRole("button", { name: /^læg i kurv$/i }).click();

    // Bekræftelsen forsvinder efter et par sekunder med vilje, så vi tjekker
    // den varige effekt: kurven i headeren tæller nu én vare.
    await expect(page.getByRole("button", { name: /kurv, 1 vare/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/kurv");
    await expect(page.getByRole("heading", { name: "Din kurv" })).toBeVisible();
    // Rolle frem for tekst: den samme streng står også i RSC-payloadet i et
    // <script>-tag, og en ren tekstsøgning rammer begge.
    await expect(page.getByRole("heading", { name: "Ordreoversigt" })).toBeVisible();

    // Fri fragt-måleren er en konfigureret grænse, ikke en hardcoded tekst.
    await expect(page.getByText(/fri fragt/i).first()).toBeVisible();

    await page
      .getByRole("link", { name: /gå til betaling/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("Kontakt og adresse")).toBeVisible();
  });

  test("tom kurv har en vej videre", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/kurv");

    // Afgrænset til hovedindholdet: mini-kurven i headeren kan vise den samme
    // tekst, og en usikret getByText rammer dem begge.
    await expect(page.locator("#indhold").getByText("Kurven er tom")).toBeVisible();
    await expect(
      page
        .locator("#indhold")
        .getByRole("link", { name: /shop filament/i })
        .first()
    ).toBeVisible();
  });
});

test.describe("Find filament", () => {
  test("guider gennem fire trin til anbefalinger", async ({ page }) => {
    await page.goto("/find-filament");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find dit filament");

    // Trin 1: printer (valgfrit)
    await page.getByRole("button", { name: "Jeg vælger ikke printer" }).click();
    await page.getByRole("button", { name: "Næste" }).click();

    // Trin 2: hvad skal printes
    await page.getByRole("button", { name: "Funktionelle dele" }).click();
    await page.getByRole("button", { name: "Næste" }).click();

    // Trin 3: hvad er vigtigst
    await page.getByRole("button", { name: "Styrke" }).click();
    await page.getByRole("button", { name: "Næste" }).click();

    // Trin 4: farve
    await page.getByRole("button", { name: /vis anbefalinger/i }).click();

    await expect(page.getByRole("heading", { name: "Vi anbefaler" })).toBeVisible({
      timeout: 20_000,
    });

    // Hver anbefaling skal begrunde sig selv.
    await expect(page.getByText("Derfor").first()).toBeVisible();
  });
});

test.describe("Søgning", () => {
  test("forstår dansk og engelsk", async ({ page }) => {
    await page.goto("/soeg?q=sort%20pla");
    expect(await page.locator("article").count()).toBeGreaterThan(0);

    // "hardened" skal finde "Hærdet stål-dyse". Produktkortet har både en
    // synlig titel og skjulte labels med samme tekst, så vi går efter linket.
    await page.goto("/soeg?q=hardened");
    await expect(page.getByRole("link", { name: /hærdet stål-dyse/i }).first()).toBeVisible();
  });

  test("tom søgning ender ikke blindt", async ({ page }) => {
    await page.goto("/soeg?q=zzzzfindesikke");
    // Afgrænset til hovedindholdet: teksten optræder også i RSC-payloadet i
    // et <script>-tag, og en usikret getByText rammer begge.
    await expect(page.locator("#indhold").getByText("Ingen produkter fundet")).toBeVisible();
    // Et tomt resultat skal tilbyde en vej videre, ikke bare en blank side.
    await expect(
      page.getByRole("link", { name: /lad os finde det rigtige filament/i })
    ).toBeVisible();
  });
});

test.describe("Tilgængelighed", () => {
  test("har skip-link og landmarks", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Spring til indhold" })).toBeFocused();

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    // Hovedmenuen er den samme uanset bredde — men under lg ligger den bag
    // en knap, så vi åbner skuffen først. At begge veje fører til samme
    // landmark er hele pointen.
    const openMenu = page.getByRole("button", { name: "Åbn menu" });
    if (await openMenu.isVisible()) await openMenu.click();

    await expect(page.getByRole("navigation", { name: "Hovedmenu" })).toBeVisible();
  });

  test("hvert billede har alt-tekst", async ({ page }) => {
    await page.goto("/filament");

    const missing = await page.evaluate(
      () =>
        [...document.querySelectorAll("img")].filter((image) => !image.hasAttribute("alt")).length
    );
    expect(missing).toBe(0);
  });
});

test.describe("Navigation", () => {
  // Denne kørte kun på desktop: menuens links er de samme uanset bredde, og
  // en fuld gennemgang tre gange er spildte minutter i CI.
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "Kun desktop");

  test("ingen døde links i menu og footer", async ({ page }) => {
    await page.goto("/");

    // Hver eneste interne href i header og footer — inklusive mega-menuens
    // skjulte kolonner. Et link, der peger på en side, vi aldrig byggede, er
    // usynligt indtil en kunde klikker på det.
    const hrefs = await page.evaluate(() => {
      const roots = [document.querySelector("header"), document.querySelector("footer")];
      const found = new Set<string>();
      for (const root of roots) {
        for (const anchor of root?.querySelectorAll("a[href]") ?? []) {
          const href = anchor.getAttribute("href") ?? "";
          if (href.startsWith("/") && !href.startsWith("//")) found.add(href.split("#")[0]!);
        }
      }
      return [...found];
    });

    expect(hrefs.length).toBeGreaterThan(15);

    const broken: string[] = [];
    for (const href of hrefs) {
      const response = await page.goto(href);

      // Statuskoden alene er ikke nok: rammer notFound() bag en
      // streaming-grænse, er svaret allerede sendt som 200. Og 404-sidens
      // tekst ligger i RSC-payloadet på *alle* sider, så vi kan heller ikke
      // søge i HTML'en. Det, der holder, er hvad brugeren rent faktisk ser.
      const heading = await page.getByRole("heading", { level: 1 }).first().textContent();
      const notFound = (heading ?? "").includes("Siden findes ikke");

      if (!response?.ok() || notFound) broken.push(`${href} (${response?.status() ?? "?"})`);
    }

    expect(broken, `Døde links: ${broken.join(", ")}`).toEqual([]);
  });

  test("ukendt URL giver 404-siden, ikke en tom butiksside", async ({ page }) => {
    await page.goto("/en-url-der-ikke-findes");
    await expect(page.getByRole("heading", { name: /siden findes ikke/i })).toBeVisible();
    // Den må aldrig indekseres, selv når statuskoden er 200.
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});

test.describe("Konto", () => {
  // Kontoen er den samme uanset bredde, og oprettelsen laver en rigtig bruger
  // i databasen — én gang er nok.
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "Kun desktop");

  test("opret konto, se kontoen, hent data og log ud", async ({ page }) => {
    // Unik e-mail: testen opretter en rigtig kunde, og en gentaget kørsel må
    // ikke fejle på en adresse, den selv lavede sidste gang.
    const email = `e2e-${Date.now()}@nordprint-test.dk`;

    // Gem en favorit som gæst — den skal følge med ind i kontoen.
    await page.goto("/produkt/nordprint-pla-basic");
    await page
      .getByRole("button", { name: /gem .* som favorit/i })
      .first()
      .click();

    await page.goto("/konto/log-ind?opret");
    await page.getByLabel("Fornavn").fill("E2E");
    await page.getByLabel("Efternavn").fill("Tester");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Adgangskode").fill("Hemmeligt123");
    await page
      .getByRole("button", { name: /^opret konto$/i })
      .last()
      .click();

    await expect(page).toHaveURL(/\/konto$/, { timeout: 20_000 });
    await expect(page.locator("main")).toContainText("Hej E2E");

    // Alle kontosider skal vise den indloggede tilstand, ikke logind-væggen.
    for (const path of ["/konto/ordrer", "/konto/adresser", "/konto/profil"]) {
      await page.goto(path);
      await expect(page.locator("main")).not.toContainText("Log ind for");
    }

    // Gæstens favorit fulgte med.
    await page.goto("/konto/favoritter");
    await expect(page.getByRole("link", { name: /pla basic/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // GDPR: kunden kan selv hente sine data.
    await page.goto("/konto/profil");
    const download = page.waitForEvent("download", { timeout: 20_000 });
    await page.getByRole("button", { name: /hent kopi/i }).click();
    expect((await download).suggestedFilename()).toMatch(/^nordprint-mine-data-.*\.json$/);

    // Log ud er en server action, der redirecter til forsiden. Vent på den,
    // ellers navigerer testen videre, før sessionen er ryddet.
    await page.getByRole("button", { name: /log ud/i }).click();
    await page.waitForURL("/", { timeout: 15_000 });

    await page.goto("/konto/profil");
    await expect(page.locator("main")).toContainText("Log ind for");
  });

  test("forkert adgangskode afslører ikke om kontoen findes", async ({ page }) => {
    await page.goto("/konto/log-ind");
    await page.getByLabel("E-mail").fill("findes-helt-sikkert-ikke@nordprint-test.dk");
    await page.getByLabel("Adgangskode").fill("forkert-adgangskode");
    await page
      .getByRole("button", { name: /^log ind$/i })
      .last()
      .click();

    // Samme besked uanset om e-mailen findes: alt andet er en gratis
    // brugernavnsliste for den, der spørger.
    await expect(page.getByText("E-mail eller adgangskode passer ikke.")).toBeVisible();
  });
});

test.describe("Anmeldelser", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "Kun desktop");

  test("gæster kan ikke anmelde — og bliver bedt om at logge ind", async ({ page }) => {
    await page.goto("/produkt/nordprint-pla-basic");

    const afsnit = page.locator("section[aria-labelledby=anmeldelser]");
    await expect(afsnit).toContainText("for at skrive en anmeldelse");
    await expect(afsnit.getByRole("button", { name: /skriv en anmeldelse/i })).toHaveCount(0);
  });

  test("en indsendt anmeldelse vises ikke, før den er godkendt", async ({ page }) => {
    const email = `anmelder-${Date.now()}@nordprint-test.dk`;
    const overskrift = `E2E ${Date.now()}`;

    await page.goto("/konto/log-ind?opret");
    await page.getByLabel("Fornavn").fill("Anmelder");
    await page.getByLabel("Efternavn").fill("Test");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Adgangskode").fill("Hemmeligt123");
    await page
      .getByRole("button", { name: /^opret konto$/i })
      .last()
      .click();
    await expect(page).toHaveURL(/\/konto$/, { timeout: 20_000 });

    await page.goto("/produkt/nordprint-pla-basic");
    await page.getByRole("button", { name: /skriv en anmeldelse/i }).click();

    // Radioen er sr-only inde i sit label — brugeren klikker på label'et.
    await page
      .locator("label")
      .filter({ hasText: /^4 ud af 5$/ })
      .click();
    await page.getByLabel(/overskrift/i).fill(overskrift);
    await page
      .locator("#review-body")
      .fill("Kørte fint på en A1 uden fejlprint. Diameteren virker jævn hele spolen igennem.");
    await page.getByRole("button", { name: /send anmeldelse/i }).click();

    await expect(page.locator("section[aria-labelledby=anmeldelser]")).toContainText(
      "sendt til gennemlæsning"
    );

    // Det vigtigste i hele testen: den må ikke være publiceret.
    await page.reload();
    await expect(page.locator("section[aria-labelledby=anmeldelser]")).not.toContainText(
      overskrift
    );
  });

  test("for kort tekst afvises, før den sendes", async ({ page }) => {
    const email = `kort-${Date.now()}@nordprint-test.dk`;

    await page.goto("/konto/log-ind?opret");
    await page.getByLabel("Fornavn").fill("Kort");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Adgangskode").fill("Hemmeligt123");
    await page
      .getByRole("button", { name: /^opret konto$/i })
      .last()
      .click();
    await expect(page).toHaveURL(/\/konto$/, { timeout: 20_000 });

    await page.goto("/produkt/nordprint-pla-basic");
    await page.getByRole("button", { name: /skriv en anmeldelse/i }).click();
    await page.locator("#review-body").fill("Fin nok");
    await page.getByRole("button", { name: /send anmeldelse/i }).click();

    await expect(page.getByText("Skriv lidt mere — mindst 10 tegn.")).toBeVisible();
  });
});
