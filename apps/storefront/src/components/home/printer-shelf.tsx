import Link from "next/link";
import { TechLabel } from "@nordprint/ui";
import type { PrinterTree } from "@/lib/api/catalog";
import { PrinterIcon } from "@/components/icons";

/**
 * "Shop efter printer".
 *
 * Rendered entirely from the backend's printer tree — adding Prusa or Elegoo
 * changes this section without a deploy.
 */
export function PrinterShelf({
  brands,
}: {
  readonly brands: PrinterTree["brands"];
}): React.JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {brands.map((brand) => (
        <section key={brand.id} className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <PrinterIcon className="size-4 text-ink-faint" />
            <h3 className="text-base font-semibold text-ink">{brand.name}</h3>
          </div>

          {brand.families.map((family) => (
            <div key={family.id} className="mt-4">
              <TechLabel>{family.name}</TechLabel>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {family.models.map((model) => (
                  <li key={model.id}>
                    <Link
                      href={`/shop-efter-printer/${brand.handle}/${model.handle}`}
                      className="inline-flex items-center rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent hover:bg-accent-soft hover:text-ink"
                    >
                      {model.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
