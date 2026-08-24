import type { ProductDetail } from "@nordprint/types";
import { TechLabel } from "@nordprint/ui";
import { fetchCatalog } from "@/lib/api/catalog";
import { ProductRail } from "@/components/catalog/product-rail";

/**
 * "Andre kigger også på".
 *
 * Related products are resolved by material for filament and by category for
 * everything else — a customer looking at PETG is far more likely to want
 * another PETG than a random spool.
 */
export async function RelatedProducts({
  product,
  className,
}: {
  readonly product: ProductDetail;
  readonly className?: string;
}): Promise<React.JSX.Element | null> {
  const result = await fetchCatalog(
    product.material
      ? { material: [product.material], limit: 9, sort: "popular" }
      : { limit: 9, sort: "popular" },
    product.material ? {} : { kind: product.kind }
  );

  if (!result.ok) return null;

  const items = result.data.items.filter((entry) => entry.id !== product.id).slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section className={className}>
      <TechLabel>Relateret</TechLabel>
      <h2 className="mb-5 mt-1.5 text-xl font-bold tracking-tight">
        {product.material ? "Andre i samme materiale" : "Andre kigger også på"}
      </h2>
      <ProductRail products={items} />
    </section>
  );
}
