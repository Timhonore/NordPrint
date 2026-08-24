import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { slugify } from "@nordprint/commerce";
import { BRAND_MODULE } from "../modules/brand";
import type BrandModuleService from "../modules/brand/service";
import { FILAMENT_MODULE } from "../modules/filament";
import type FilamentModuleService from "../modules/filament/service";
import { PRINTER_MODULE } from "../modules/printer";
import type PrinterModuleService from "../modules/printer/service";
import { COMPATIBILITY_MODULE } from "../modules/compatibility";
import type CompatibilityModuleService from "../modules/compatibility/service";
import { PROCUREMENT_MODULE } from "../modules/procurement";
import type ProcurementModuleService from "../modules/procurement/service";
import { GUIDE_MODULE } from "../modules/guide";
import type GuideModuleService from "../modules/guide/service";
import {
  SEED_ACCESSORIES,
  SEED_ATTRIBUTE_DEFINITIONS,
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_FILAMENTS,
  type SeedColor,
} from "./seed-data/catalog";
import { SEED_PRINTER_BRANDS } from "./seed-data/printers";
import { SEED_GUIDES } from "./seed-data/guides";

/**
 * NordPrint development seed.
 *
 * Produces a shop that is realistic enough to develop and demo against:
 * a Danish region in DKK, a warehouse, Danish carriers, seven filaments across
 * five materials with 30+ colour variants, spare parts with real compatibility
 * rules, three guides and a full printer database.
 *
 * Everything is fictional. The house brand is NordPrint's own; the two
 * supplier brands are invented; no manufacturer copy is reproduced.
 *
 * The script is idempotent at the top level: re-running it will not duplicate
 * regions, channels or brands. Products are created once — delete them in
 * admin before re-seeding if you want them rebuilt.
 */
export default async function seedNordPrint({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const storeService = container.resolve(Modules.STORE);
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);

  const brandService = container.resolve<BrandModuleService>(BRAND_MODULE);
  const filamentService = container.resolve<FilamentModuleService>(FILAMENT_MODULE);
  const printerService = container.resolve<PrinterModuleService>(PRINTER_MODULE);
  const compatibilityService = container.resolve<CompatibilityModuleService>(COMPATIBILITY_MODULE);
  const procurementService = container.resolve<ProcurementModuleService>(PROCUREMENT_MODULE);
  const guideService = container.resolve<GuideModuleService>(GUIDE_MODULE);

  const countries = ["dk"];

  // ---------------------------------------------------------------- store
  logger.info("NordPrint: opsætter butik, region og lager …");

  const [store] = await storeService.listStores();
  if (!store) throw new Error("Ingen butik fundet — kør migrationerne først");

  // Adopt whichever sales channel the store already points at. Medusa creates
  // a "Default Sales Channel" during migration, and creating a second one
  // beside it is how a shop ends up with the publishable key on one channel
  // and the stock location on the other — carts then fail with
  // "not associated with any stock location", which is a confusing way to
  // learn you have two channels.
  const existingChannels = await salesChannelService.listSalesChannels({});
  let salesChannel =
    existingChannels.find((channel) => channel.id === store.default_sales_channel_id) ??
    existingChannels.find((channel) => channel.name === "NordPrint") ??
    existingChannels[0];

  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "NordPrint", description: "nordprint.dk" }] },
    });
    salesChannel = result[0]!;
  } else if (salesChannel.name !== "NordPrint") {
    await salesChannelService.updateSalesChannels(salesChannel.id, {
      name: "NordPrint",
      description: "nordprint.dk",
    });
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "NordPrint",
        supported_currencies: [{ currency_code: "dkk", is_default: true }],
        default_sales_channel_id: salesChannel.id,
      },
    },
  });

  const regionService = container.resolve(Modules.REGION);
  let [region] = await regionService.listRegions({ name: "Danmark" });
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Danmark",
            currency_code: "dkk",
            countries,
            payment_providers: resolvePaymentProviders(),
          },
        ],
      },
    });
    region = result[0]!;
  }

  await runQuietly(logger, "momsregioner", () =>
    createTaxRegionsWorkflow(container).run({
      input: countries.map((country_code) => ({ country_code, provider_id: "tp_system" })),
    })
  );

  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);
  let [stockLocation] = await stockLocationService.listStockLocations({ name: "NordPrint Lager" });
  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "NordPrint Lager",
            address: { city: "Aarhus", country_code: "DK", address_1: "Printervej 1" },
          },
        ],
      },
    });
    stockLocation = result[0]!;
  }

  await updateStoresWorkflow(container).run({
    input: { selector: { id: store.id }, update: { default_location_id: stockLocation.id } },
  });

  await runQuietly(logger, "salgskanal ↔ lager", () =>
    linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation!.id, add: [salesChannel!.id] },
    })
  );

  // ------------------------------------------------------------- shipping
  logger.info("NordPrint: opsætter fragt …");

  let [shippingProfile] = await fulfillmentService.listShippingProfiles({ type: "default" });
  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "NordPrint standard", type: "default" }] },
    });
    shippingProfile = result[0]!;
  }

  const existingSets = await fulfillmentService.listFulfillmentSets({ name: "NordPrint Danmark" });
  let fulfillmentSet = existingSets[0];
  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentService.createFulfillmentSets({
      name: "NordPrint Danmark",
      type: "shipping",
      service_zones: [{ name: "Danmark", geo_zones: [{ country_code: "dk", type: "country" }] }],
    });

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    } as never);

    for (const providerId of ["manual_manual", "danish-carriers_danish-carriers"]) {
      await runQuietly(logger, `fragtudbyder ${providerId}`, async () => {
        await link.create({
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation!.id },
          [Modules.FULFILLMENT]: { fulfillment_provider_id: providerId },
        } as never);
      });
    }

    const serviceZoneId = fulfillmentSet.service_zones[0]!.id;
    await runQuietly(logger, "fragtmetoder", () =>
      createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: "GLS pakkeshop",
            price_type: "calculated",
            provider_id: "danish-carriers_danish-carriers",
            service_zone_id: serviceZoneId,
            shipping_profile_id: shippingProfile!.id,
            type: { label: "Pakkeshop", description: "Afhent hos GLS", code: "gls-pickup" },
            data: { carrier_id: "gls", kind: "pickup_point" },
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
          {
            name: "GLS hjemmelevering",
            price_type: "calculated",
            provider_id: "danish-carriers_danish-carriers",
            service_zone_id: serviceZoneId,
            shipping_profile_id: shippingProfile!.id,
            type: { label: "Hjemmelevering", description: "Leveres til døren", code: "gls-home" },
            data: { carrier_id: "gls", kind: "home" },
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
          {
            name: "DAO pakkeshop",
            price_type: "calculated",
            provider_id: "danish-carriers_danish-carriers",
            service_zone_id: serviceZoneId,
            shipping_profile_id: shippingProfile!.id,
            type: { label: "Pakkeshop", description: "Afhent hos DAO", code: "dao-pickup" },
            data: { carrier_id: "dao", kind: "pickup_point" },
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
        ],
      })
    );
  }

  // ------------------------------------------------------- publishable key
  const apiKeyService = container.resolve(Modules.API_KEY);
  let [publishableKey] = await apiKeyService.listApiKeys({ type: "publishable" });

  if (!publishableKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [{ title: "NordPrint storefront", type: "publishable", created_by: "seed" }],
      },
    });
    publishableKey = result[0]!;
  }

  // Linked unconditionally, not only for a freshly created key: a key that
  // already existed is exactly the case where the link is missing, and a
  // storefront with an unlinked key can browse but never add to a cart.
  await runQuietly(logger, "nøgle ↔ salgskanal", () =>
    linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableKey!.id, add: [salesChannel!.id] },
    })
  );

  // ------------------------------------------------------------ categories
  logger.info("NordPrint: opretter kategorier …");
  const categoryIdByHandle = await seedCategories(container);

  // --------------------------------------------------------------- brands
  logger.info("NordPrint: opretter brands …");
  const brandIdByHandle = new Map<string, string>();
  for (const seed of SEED_BRANDS) {
    const [existing] = await brandService.listBrands({ handle: seed.handle });
    if (existing) {
      brandIdByHandle.set(seed.handle, existing.id);
      continue;
    }
    const created = await brandService.createBrands(seed as never);
    const brand = Array.isArray(created) ? created[0]! : created;
    brandIdByHandle.set(seed.handle, brand.id);
  }

  // -------------------------------------------------------------- printers
  logger.info("NordPrint: opretter printerdatabase …");
  const printerModelIdByHandle = await seedPrinters(printerService);

  // ------------------------------------------------ attribute definitions
  for (const definition of SEED_ATTRIBUTE_DEFINITIONS) {
    const [existing] = await filamentService.listFilamentAttributeDefinitions({
      key: definition.key,
    });
    if (!existing) {
      await filamentService.createFilamentAttributeDefinitions(definition as never);
    }
  }

  // ------------------------------------------------------------- products
  logger.info("NordPrint: opretter produkter …");

  const productsInput = [
    ...SEED_FILAMENTS.map((filament) => ({
      title: filament.title,
      subtitle: filament.subtitle,
      handle: filament.handle,
      description: filament.description,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      weight: filament.grossWeightG,
      metadata: { kind: "filament", seed: "nordprint-dev" },
      category_ids: filament.categoryHandles
        .map((handle) => categoryIdByHandle.get(handle))
        .filter((id): id is string => Boolean(id)),
      sales_channels: [{ id: salesChannel.id }],
      options: [
        { title: "Farve", values: filament.colors.map((color) => color.name) },
        { title: "Vægt", values: [formatWeight(filament.netWeightG)] },
      ],
      variants: filament.colors.map((color, index) => ({
        title: `${color.name} / ${formatWeight(filament.netWeightG)}`,
        sku: skuFor(filament.handle, color, filament.netWeightG),
        ean: eanFor(filament.handle, index),
        manage_inventory: true,
        allow_backorder: false,
        variant_rank: index,
        weight: filament.grossWeightG,
        options: {
          Farve: color.name,
          Vægt: formatWeight(filament.netWeightG),
        },
        prices: [{ currency_code: "dkk", amount: toMajor(filament.price) }],
      })),
    })),

    ...SEED_ACCESSORIES.map((accessory) => ({
      title: accessory.title,
      subtitle: accessory.subtitle,
      handle: accessory.handle,
      description: accessory.description,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      weight: accessory.weightG,
      metadata: { kind: accessory.kind, seed: "nordprint-dev" },
      category_ids: accessory.categoryHandles
        .map((handle) => categoryIdByHandle.get(handle))
        .filter((id): id is string => Boolean(id)),
      sales_channels: [{ id: salesChannel.id }],
      options: [{ title: "Variant", values: accessory.variants.map((variant) => variant.title) }],
      variants: accessory.variants.map((variant, index) => ({
        title: variant.title,
        sku: variant.sku,
        manage_inventory: true,
        allow_backorder: false,
        variant_rank: index,
        weight: accessory.weightG,
        options: { Variant: variant.title },
        prices: [
          { currency_code: "dkk", amount: toMajor(accessory.price + (variant.priceDelta ?? 0)) },
        ],
      })),
    })),
  ];

  const existingHandles = new Set<string>(
    (
      await knex("product")
        .whereIn(
          "handle",
          productsInput.map((product) => product.handle)
        )
        .whereNull("deleted_at")
        .select("handle")
    ).map((row: { handle: string }) => row.handle)
  );

  const toCreate = productsInput.filter((product) => !existingHandles.has(product.handle));

  if (toCreate.length > 0) {
    await createProductsWorkflow(container).run({ input: { products: toCreate as never } });
    logger.info(`NordPrint: oprettede ${toCreate.length} produkter.`);
  } else {
    logger.info("NordPrint: produkterne findes allerede — springer over.");
  }

  // Read everything back so the rest of the seed works on real ids.
  const productRows = await knex("product")
    .whereIn(
      "handle",
      productsInput.map((product) => product.handle)
    )
    .whereNull("deleted_at")
    .select("id", "handle");
  const productIdByHandle = new Map<string, string>(
    productRows.map((row: any) => [row.handle, row.id])
  );

  const variantRows = await knex("product_variant")
    .whereIn("product_id", [...productIdByHandle.values()])
    .whereNull("deleted_at")
    .select("id", "sku", "product_id");
  const variantIdBySku = new Map<string, string>(variantRows.map((row: any) => [row.sku, row.id]));

  // ------------------------------------------------------------- tilbud
  // Discounts are modelled as a real Medusa sale price list, not by
  // overwriting the price. That is what makes the før-pris genuine: the
  // original price still exists and is what the storefront strikes through.
  const saleFilaments = SEED_FILAMENTS.filter((filament) => filament.salePrice !== undefined);
  if (saleFilaments.length > 0) {
    const [existingList] = await knex("price_list")
      .where({ title: "Sensommertilbud" })
      .whereNull("deleted_at")
      .select("id");

    if (!existingList) {
      const salePrices = saleFilaments.flatMap((filament) =>
        filament.colors
          .map((color) => variantIdBySku.get(skuFor(filament.handle, color, filament.netWeightG)))
          .filter((variantId): variantId is string => Boolean(variantId))
          .map((variantId) => ({
            currency_code: "dkk",
            amount: toMajor(filament.salePrice!),
            variant_id: variantId,
          }))
      );

      await runQuietly(logger, "tilbudspriser", () =>
        createPriceListsWorkflow(container).run({
          input: {
            price_lists_data: [
              {
                title: "Sensommertilbud",
                description: "Udviklingsdata: viser tilbudsflowet med en ægte førpris.",
                // Medusa defaults price lists to type "sale", which is exactly
                // what the storefront reads as a discount with a førpris.
                status: "active" as never,
                prices: salePrices,
              },
            ],
          },
        })
      );
    }
  }

  // ------------------------------------------------------------ inventory
  logger.info("NordPrint: sætter lagerbeholdning …");
  await seedInventory(container, knex, stockLocation.id, buildStockBySku());

  // ------------------------------------------------------- filament specs
  logger.info("NordPrint: knytter filamentdata til produkter …");
  for (const filament of SEED_FILAMENTS) {
    const productId = productIdByHandle.get(filament.handle);
    if (!productId) continue;

    const [existingSpec] = await filamentService.listFilamentSpecs({ product_id: productId });
    let specId = existingSpec?.id;

    if (!specId) {
      const created = await filamentService.createFilamentSpecs({
        product_id: productId,
        manufacturer: SEED_BRANDS.find((brand) => brand.handle === filament.brandHandle)?.name,
        material: filament.material,
        material_variant: filament.materialVariant,
        finish: filament.finish,
        diameter_mm: filament.diameterMm,
        net_filament_weight_g: filament.netWeightG,
        gross_weight_g: filament.grossWeightG,
        density_g_cm3: filament.densityGCm3,
        nozzle_temperature_min: filament.nozzle[0],
        nozzle_temperature_max: filament.nozzle[1],
        bed_temperature_min: filament.bed[0],
        bed_temperature_max: filament.bed[1],
        drying_temperature: filament.drying[0],
        drying_duration_hours: filament.drying[1],
        max_volumetric_speed: filament.maxVolumetricSpeed,
        heat_resistance_c: filament.heatResistanceC,
        enclosure_recommended: filament.enclosureRecommended,
        hardened_nozzle_recommended: filament.hardenedNozzleRecommended,
        abrasive: filament.abrasive,
        food_contact_information: filament.foodContactInformation,
        ams_compatible: filament.amsCompatible,
        ams_lite_compatible: filament.amsLiteCompatible,
        spool_material: filament.spoolMaterial,
        rating_printability: filament.ratings.printability,
        rating_strength: filament.ratings.strength,
        rating_flexibility: filament.ratings.flexibility,
        rating_heat_resistance: filament.ratings.heatResistance,
        rating_uv_resistance: filament.ratings.uvResistance,
        rating_layer_adhesion: filament.ratings.layerAdhesion,
      } as never);

      const spec = Array.isArray(created) ? created[0]! : created;
      specId = spec.id;

      await link.create({
        [Modules.PRODUCT]: { product_id: productId },
        [FILAMENT_MODULE]: { filament_spec_id: specId },
      } as never);
    }

    if (filament.attributes) {
      await filamentService.setAttributes(
        specId,
        Object.entries(filament.attributes).map(([key, value]) => ({ key, value }))
      );
    }

    // Brand link.
    const brandId = brandIdByHandle.get(filament.brandHandle);
    if (brandId) {
      await runQuietly(logger, `brandlink ${filament.handle}`, async () => {
        // Brand first: the link is defined brand → products.
        await link.create({
          [BRAND_MODULE]: { brand_id: brandId },
          [Modules.PRODUCT]: { product_id: productId },
        } as never);
      });
    }

    // Variant-level colour data.
    for (const color of filament.colors) {
      const sku = skuFor(filament.handle, color, filament.netWeightG);
      const variantId = variantIdBySku.get(sku);
      if (!variantId) continue;

      const [existingVariantSpec] = await filamentService.listFilamentVariantSpecs({
        variant_id: variantId,
      });
      if (existingVariantSpec) continue;

      const created = await filamentService.createFilamentVariantSpecs({
        variant_id: variantId,
        color_name: color.name,
        color_hex: color.hex,
        color_hex_secondary: color.hexSecondary ?? null,
        manufacturer_color_code: color.code,
        color_family: color.family,
        diameter_mm: filament.diameterMm,
        net_filament_weight_g: filament.netWeightG,
        expected_restock_at:
          color.expectedRestockInDays !== undefined
            ? new Date(Date.now() + color.expectedRestockInDays * 24 * 60 * 60 * 1000)
            : null,
      } as never);

      const variantSpec = Array.isArray(created) ? created[0]! : created;
      await link.create({
        [Modules.PRODUCT]: { product_variant_id: variantId },
        [FILAMENT_MODULE]: { filament_variant_spec_id: variantSpec.id },
      } as never);

      await procurementService.setCost({
        variantId,
        costPrice: filament.costPrice,
        currencyCode: "dkk",
        supplierName: "Udviklingsdata",
      });
    }
  }

  // Accessory brands + cost prices.
  for (const accessory of SEED_ACCESSORIES) {
    const productId = productIdByHandle.get(accessory.handle);
    if (!productId) continue;

    const brandId = brandIdByHandle.get(accessory.brandHandle);
    if (brandId) {
      await runQuietly(logger, `brandlink ${accessory.handle}`, async () => {
        // Brand first: the link is defined brand → products.
        await link.create({
          [BRAND_MODULE]: { brand_id: brandId },
          [Modules.PRODUCT]: { product_id: productId },
        } as never);
      });
    }

    for (const variant of accessory.variants) {
      const variantId = variantIdBySku.get(variant.sku);
      if (!variantId) continue;
      await procurementService.setCost({
        variantId,
        costPrice: accessory.costPrice,
        currencyCode: "dkk",
        supplierName: "Udviklingsdata",
      });
    }
  }

  // --------------------------------------------------------- compatibility
  logger.info("NordPrint: opretter kompatibilitetsregler …");
  for (const accessory of SEED_ACCESSORIES) {
    const productId = productIdByHandle.get(accessory.handle);
    if (!productId || !accessory.compatibility) continue;

    for (const rule of accessory.compatibility) {
      const printerModelId = printerModelIdByHandle.get(rule.printerHandle);
      if (!printerModelId) continue;

      await compatibilityService.upsertRule({
        subjectType: "product",
        subjectId: productId,
        targetType: "printer_model",
        targetId: printerModelId,
        status: rule.status,
        note: rule.note ?? null,
      });
    }
  }

  // Filament compatibility, derived from the specification: a filament that
  // needs a hardened nozzle is only "compatible" with printers that have one.
  const bambuBrandId = await resolvePrinterBrandId(printerService, "bambu-lab");
  for (const filament of SEED_FILAMENTS) {
    const productId = productIdByHandle.get(filament.handle);
    if (!productId || !bambuBrandId) continue;

    if (filament.abrasive || filament.hardenedNozzleRecommended) {
      for (const [handle, modelId] of printerModelIdByHandle) {
        const model = await printerService.retrieveModelWithLineage(modelId);
        if (!model) continue;
        const fits = model.hardenedNozzleStock;
        await compatibilityService.upsertRule({
          subjectId: productId,
          targetType: "printer_model",
          targetId: modelId,
          status: fits ? "compatible" : "conditional",
          note: fits ? null : `Kræver hærdet dyse på ${model.displayName}.`,
        });
        void handle;
      }
      continue;
    }

    if (filament.enclosureRecommended) {
      for (const [, modelId] of printerModelIdByHandle) {
        const model = await printerService.retrieveModelWithLineage(modelId);
        if (!model) continue;
        await compatibilityService.upsertRule({
          subjectId: productId,
          targetType: "printer_model",
          targetId: modelId,
          status: model.enclosed ? "compatible" : "conditional",
          note: model.enclosed
            ? null
            : `${model.displayName} har ikke lukket kabinet — forvent warping ved store dele.`,
        });
      }
      continue;
    }

    // Everyday filament fits every Bambu machine: one brand-level rule.
    await compatibilityService.upsertRule({
      subjectId: productId,
      targetType: "printer_brand",
      targetId: bambuBrandId,
      status: "compatible",
      note: null,
    });
  }

  // --------------------------------------------------------------- guides
  logger.info("NordPrint: opretter guides …");
  for (const [index, guide] of SEED_GUIDES.entries()) {
    const [existing] = await guideService.listGuides({ slug: guide.slug });
    if (existing) continue;

    await guideService.createGuides({
      slug: guide.slug,
      title: guide.title,
      intro: guide.intro,
      content: guide.content,
      author: guide.author,
      tags: guide.tags,
      seo_title: guide.seoTitle,
      seo_description: guide.seoDescription,
      related_guide_slugs: guide.relatedGuideSlugs,
      related_product_ids: SEED_FILAMENTS.slice(0, 3)
        .map((filament) => productIdByHandle.get(filament.handle))
        .filter((id): id is string => Boolean(id)),
      published_at: new Date(),
      rank: index,
    } as never);
  }

  // ---------------------------------------------------------------- verify
  //
  // The links above are created through workflows that fail softly when the
  // link already exists. That is convenient for re-runs and dangerous for a
  // first run: a swallowed failure leaves a shop that browses fine and cannot
  // sell. So the seed checks its own work and refuses to report success on a
  // configuration that would break at the first "læg i kurv".
  logger.info("NordPrint: kontrollerer opsætningen …");

  const problems: string[] = [];

  const [keyLink] = await knex("publishable_api_key_sales_channel")
    .where({ publishable_key_id: publishableKey.id, sales_channel_id: salesChannel.id })
    .whereNull("deleted_at")
    .select("id");
  if (!keyLink) {
    problems.push(
      "Den publishable API-nøgle er ikke knyttet til salgskanalen — storefront kan ikke lægge i kurv."
    );
  }

  const [locationLink] = await knex("sales_channel_stock_location")
    .where({ sales_channel_id: salesChannel.id, stock_location_id: stockLocation.id })
    .whereNull("deleted_at")
    .select("id");
  if (!locationLink) {
    problems.push("Salgskanalen er ikke knyttet til lageret — varer kan ikke reserveres ved køb.");
  }

  const [{ count: levelCount }] = await knex("inventory_level")
    .whereNull("deleted_at")
    .count("* as count");
  if (Number(levelCount) === 0) {
    problems.push("Der er ingen lagerniveauer — alt vil fremstå som udsolgt.");
  }

  if (problems.length > 0) {
    for (const problem of problems) logger.error(`NordPrint: ${problem}`);
    throw new Error(
      `Seed'en fuldførte, men opsætningen er ikke brugbar (${problems.length} problemer, se ovenfor).`
    );
  }

  // The publishable key is generated, not chosen, so the storefront cannot
  // know it in advance. Writing it to a file means `pnpm dev` and CI pick it
  // up without a human copying a 64-character token out of a log.
  await writePublishableKeyFile(logger, publishableKey.token);

  logger.info("");
  logger.info("NordPrint: seed færdig.");
  logger.info(`  Publishable API key: ${publishableKey.token}`);
  logger.info(`  Region: ${region.name} (${region.currency_code.toUpperCase()})`);
  logger.info(`  Produkter: ${productIdByHandle.size}`);
  logger.info(`  Printere: ${printerModelIdByHandle.size}`);
  logger.info("");
  logger.info("  Alle produkter er UDVIKLINGSDATA og markeret med metadata.seed=nordprint-dev.");
}

// ---------------------------------------------------------------- helpers

/**
 * Writes the generated publishable key where the storefront reads it.
 *
 * `.env.local` is gitignored and only the key line is rewritten, so a
 * developer's own overrides in the same file survive a re-seed.
 */
async function writePublishableKeyFile(
  logger: { info: (message: string) => void; warn: (message: string) => void },
  token: string
): Promise<void> {
  const target = path.resolve(process.cwd(), "../storefront/.env.local");
  const line = `MEDUSA_PUBLISHABLE_KEY=${token}`;

  try {
    let contents = "";
    try {
      contents = await readFile(target, "utf8");
    } catch {
      contents =
        "NEXT_PUBLIC_SITE_URL=http://localhost:8000\n" +
        "NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000\n";
    }

    const next = /^MEDUSA_PUBLISHABLE_KEY=.*$/m.test(contents)
      ? contents.replace(/^MEDUSA_PUBLISHABLE_KEY=.*$/m, line)
      : `${contents.endsWith("\n") || contents === "" ? contents : `${contents}\n`}${line}\n`;

    await writeFile(target, next, "utf8");
    logger.info(`NordPrint: skrev publishable key til ${target}`);
  } catch (error) {
    // Not fatal — the key is printed below, and a read-only checkout is a
    // legitimate way to run the seed.
    logger.warn(
      `NordPrint: kunne ikke skrive .env.local (${error instanceof Error ? error.message : "ukendt fejl"}). Kopiér nøglen manuelt.`
    );
  }
}

/** Medusa takes prices in the major unit; the seed data is in minor units. */
const toMajor = (minor: number): number => minor / 100;

const formatWeight = (grams: number): string =>
  grams % 1000 === 0 ? `${grams / 1000} kg` : `${grams} g`;

function skuFor(productHandle: string, color: SeedColor, weightG: number): string {
  const base = productHandle
    .split("-")
    .map((part) => part.slice(0, 3).toUpperCase())
    .join("-");
  return `${base}-${slugify(color.name).slice(0, 6).toUpperCase()}-${weightG}`;
}

/**
 * Deterministic fake GTIN-13 for development. Uses the 200-299 prefix range,
 * which GS1 reserves for internal use — these can never collide with a real
 * product's barcode.
 */
function eanFor(productHandle: string, index: number): string {
  let hash = 0;
  for (const char of productHandle) hash = (hash * 31 + char.charCodeAt(0)) % 100_000;
  const body = `29${String(hash).padStart(5, "0")}${String(index).padStart(4, "0")}`;
  return body + gtinCheckDigit(body);
}

function gtinCheckDigit(body: string): string {
  const sum = [...body]
    .reverse()
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}

function buildStockBySku(): Map<string, number> {
  const stock = new Map<string, number>();
  for (const filament of SEED_FILAMENTS) {
    for (const color of filament.colors) {
      stock.set(skuFor(filament.handle, color, filament.netWeightG), color.stock);
    }
  }
  for (const accessory of SEED_ACCESSORIES) {
    for (const variant of accessory.variants) stock.set(variant.sku, variant.stock);
  }
  return stock;
}

/**
 * Payment providers registered for the region. The development stub is only
 * available outside production — see medusa-config.ts.
 */
function resolvePaymentProviders(): string[] {
  const providers = ["pp_system_default"];
  if (process.env.VIPPS_MOBILEPAY_CLIENT_ID) providers.push("pp_mobilepay_mobilepay");
  if (process.env.NODE_ENV !== "production") providers.push("pp_development_development");
  return providers;
}

async function seedCategories(container: ExecArgs["container"]): Promise<Map<string, string>> {
  const productService = container.resolve(Modules.PRODUCT);
  const byHandle = new Map<string, string>();

  // Parents first, so children can reference them.
  for (const level of [null, "parent"] as const) {
    const batch = SEED_CATEGORIES.filter((category) =>
      level === null ? category.parent === null : category.parent !== null
    );

    const missing: typeof batch = [];
    for (const category of batch) {
      const [existing] = await productService.listProductCategories({ handle: category.handle });
      if (existing) byHandle.set(category.handle, existing.id);
      else missing.push(category);
    }

    if (missing.length === 0) continue;

    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missing.map((category) => ({
          name: category.name,
          handle: category.handle,
          is_active: true,
          rank: category.rank,
          ...(category.parent ? { parent_category_id: byHandle.get(category.parent) } : {}),
        })),
      },
    });

    for (const created of result) byHandle.set(created.handle, created.id);
  }

  return byHandle;
}

async function seedPrinters(printerService: PrinterModuleService): Promise<Map<string, string>> {
  const modelIdByHandle = new Map<string, string>();

  for (const brandSeed of SEED_PRINTER_BRANDS) {
    let [brand] = await printerService.listPrinterBrands({ handle: brandSeed.handle });
    if (!brand) {
      const created = await printerService.createPrinterBrands({
        name: brandSeed.name,
        handle: brandSeed.handle,
        website_url: brandSeed.websiteUrl,
        rank: brandSeed.rank,
      } as never);
      brand = Array.isArray(created) ? created[0]! : created;
    }

    for (const familySeed of brandSeed.families) {
      let [family] = await printerService.listPrinterFamilies({ handle: familySeed.handle });
      if (!family) {
        const created = await printerService.createPrinterFamilies({
          brand_id: brand.id,
          name: familySeed.name,
          handle: familySeed.handle,
          description: familySeed.description,
          rank: familySeed.rank,
        } as never);
        family = Array.isArray(created) ? created[0]! : created;
      }

      for (const modelSeed of familySeed.models) {
        let [model] = await printerService.listPrinterModels({ handle: modelSeed.handle });
        if (!model) {
          const created = await printerService.createPrinterModels({
            family_id: family.id,
            name: modelSeed.name,
            handle: modelSeed.handle,
            technology: "fdm",
            release_year: modelSeed.releaseYear,
            enclosed: modelSeed.enclosed,
            heated_bed: true,
            max_nozzle_temperature: modelSeed.maxNozzleTemperature,
            max_bed_temperature: modelSeed.maxBedTemperature,
            build_volume_x: modelSeed.buildVolume[0],
            build_volume_y: modelSeed.buildVolume[1],
            build_volume_z: modelSeed.buildVolume[2],
            default_nozzle_diameter_mm: modelSeed.defaultNozzleDiameterMm,
            supports_ams: modelSeed.supportsAms,
            supports_ams_lite: modelSeed.supportsAmsLite,
            hardened_nozzle_stock: modelSeed.hardenedNozzleStock,
            rank: modelSeed.rank,
            active: true,
          } as never);
          model = Array.isArray(created) ? created[0]! : created;
        }
        modelIdByHandle.set(modelSeed.handle, model.id);
      }
    }
  }

  return modelIdByHandle;
}

async function resolvePrinterBrandId(
  printerService: PrinterModuleService,
  handle: string
): Promise<string | null> {
  const [brand] = await printerService.listPrinterBrands({ handle });
  return brand?.id ?? null;
}

/**
 * Creates inventory levels for every seeded variant.
 *
 * Medusa creates the inventory items with the products; this attaches a level
 * at the warehouse and sets the quantity.
 */
async function seedInventory(
  container: ExecArgs["container"],
  knex: any,
  locationId: string,
  stockBySku: Map<string, number>
): Promise<void> {
  const rows = await knex("product_variant as v")
    .join("product_variant_inventory_item as pvii", function join(this: any) {
      this.on("pvii.variant_id", "=", "v.id").andOnNull("pvii.deleted_at");
    })
    .whereIn("v.sku", [...stockBySku.keys()])
    .whereNull("v.deleted_at")
    .select("v.sku", "pvii.inventory_item_id");

  if (rows.length === 0) return;

  const existingLevels = await knex("inventory_level")
    .whereIn(
      "inventory_item_id",
      rows.map((row: any) => row.inventory_item_id)
    )
    .whereNull("deleted_at")
    .select("inventory_item_id");
  const known = new Set(existingLevels.map((row: any) => row.inventory_item_id));

  const toCreate = rows
    .filter((row: any) => !known.has(row.inventory_item_id))
    .map((row: any) => ({
      inventory_item_id: row.inventory_item_id,
      location_id: locationId,
      stocked_quantity: stockBySku.get(row.sku) ?? 0,
    }));

  if (toCreate.length > 0) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: toCreate },
    });
  }

  // Re-seeding should reset quantities to the seed values, otherwise
  // development stock drifts as soon as anyone places a test order.
  const inventoryService = container.resolve(Modules.INVENTORY);
  const levels = await knex("inventory_level")
    .whereIn(
      "inventory_item_id",
      rows.map((row: any) => row.inventory_item_id)
    )
    .whereNull("deleted_at")
    .select("id", "inventory_item_id", "location_id");

  const skuByItem = new Map<string, string>(
    rows.map((row: any) => [row.inventory_item_id, row.sku])
  );

  // The inventory module identifies a level by item + location, not by id.
  const updates = levels
    .map((level: any) => {
      const sku = skuByItem.get(level.inventory_item_id);
      const quantity = sku ? stockBySku.get(sku) : undefined;
      return quantity === undefined
        ? null
        : {
            inventory_item_id: level.inventory_item_id,
            location_id: locationId,
            stocked_quantity: quantity,
          };
    })
    .filter(Boolean);

  if (updates.length > 0) {
    await inventoryService.updateInventoryLevels(updates as never);
  }
}

/**
 * Runs a seed step, logging and continuing on "already exists" style errors.
 * Re-running the seed must never be destructive or noisy.
 */
async function runQuietly(
  logger: { warn: (message: string) => void },
  label: string,
  step: () => Promise<unknown>
): Promise<void> {
  try {
    await step();
  } catch (error) {
    logger.warn(
      `NordPrint: sprang "${label}" over — ${error instanceof Error ? error.message : "ukendt fejl"}`
    );
  }
}
