import Link from "next/link";
import Image from "next/image";
import type { Brand } from "@nordprint/types";

/**
 * "Populære brands".
 *
 * Brands come from the backend. Those without a logo fall back to their name
 * set in the brand's own typography, which reads better than a placeholder
 * image box.
 */
export function BrandStrip({ brands }: { readonly brands: Brand[] }): React.JSX.Element {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {brands.map((brand) => (
        <li key={brand.id}>
          <Link
            href={`/filament?brand=${brand.handle}`}
            className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-4 transition-colors hover:border-line-strong hover:bg-surface-muted"
          >
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={120}
                height={36}
                className="max-h-9 w-auto object-contain"
              />
            ) : (
              <span className="text-center text-base font-semibold tracking-tight text-ink">
                {brand.name}
              </span>
            )}
            {brand.productCount !== undefined && brand.productCount > 0 ? (
              <span className="text-xs text-ink-faint">{brand.productCount} varer</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
