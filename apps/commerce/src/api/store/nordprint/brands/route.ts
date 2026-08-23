import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { BRAND_MODULE } from "../../../../modules/brand";
import type BrandModuleService from "../../../../modules/brand/service";

/**
 * GET /store/nordprint/brands
 *
 * Brands come from the backend, never from a hardcoded list in the storefront.
 * The mega-menu, the brand facet and the "Populære brands" section all read
 * this endpoint, so adding Polymaker is an admin action, not a deploy.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE);
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  const featuredOnly = req.query.featured === "true" || req.query.featured === "1";

  const brands = await brandService.listBrands(featuredOnly ? { featured: true } : {}, {
    order: { rank: "ASC", name: "ASC" },
  });

  // Product counts, so the menu can hide brands with nothing to sell.
  const counts = await knex.raw(
    `SELECT l.brand_id, COUNT(DISTINCT p.id)::int AS count
     FROM brand_brand_product_product l
     JOIN product p ON p.id = l.product_id AND p.deleted_at IS NULL AND p.status = 'published'
     WHERE l.deleted_at IS NULL
     GROUP BY l.brand_id`
  );
  const countByBrand = new Map<string, number>(
    (counts.rows ?? []).map((row: any) => [row.brand_id, Number(row.count)])
  );

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=900");
  res.json({
    brands: brands
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        handle: brand.handle,
        logoUrl: brand.logo_url ?? null,
        description: brand.description ?? null,
        rank: brand.rank ?? 0,
        productCount: countByBrand.get(brand.id) ?? 0,
      }))
      .filter((brand) => brand.productCount > 0),
  });
}

export const AUTHENTICATE = false;
