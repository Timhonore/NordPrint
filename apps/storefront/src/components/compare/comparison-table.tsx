import Link from "next/link";
import Image from "next/image";
import type { ProductDetail } from "@nordprint/types";
import { FINISH_LABELS, MATERIAL_LABELS } from "@nordprint/types";
import { formatMoney, formatSpoolWeight } from "@nordprint/commerce";
import { StockIndicator, cn } from "@nordprint/ui";
import { CheckIcon, XIcon } from "@/components/icons";

/**
 * The comparison table.
 *
 * Two things make this readable rather than a wall of numbers:
 *
 *  1. **Differences are highlighted.** A row where every product says the same
 *     thing is dimmed, so the eye lands on what actually differs. Highlighting
 *     everything is the same as highlighting nothing.
 *  2. **It transposes on mobile.** Below `md` each product becomes its own card
 *     with the same rows — a four-column table on a 360 px screen is either
 *     unreadable or requires horizontal scrolling through the labels.
 */
interface Row {
  readonly label: string;
  readonly values: (string | React.ReactNode)[];
  /** Comparable form, used to decide whether the row differs. */
  readonly keys: (string | null)[];
}

export function ComparisonTable({
  products,
  className,
}: {
  readonly products: readonly ProductDetail[];
  readonly className?: string;
}): React.JSX.Element {
  const rows = buildRows(products);

  return (
    <div className={className}>
      {/* Desktop: products as columns */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Sammenligning af {products.map((product) => product.title).join(", ")}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-44 p-3 text-left align-bottom">
                <span className="sr-only">Egenskab</span>
              </th>
              {products.map((product) => (
                <th key={product.id} scope="col" className="p-3 text-left align-bottom">
                  <Link href={`/produkt/${product.handle}`} className="group block">
                    <span className="mb-2 block aspect-square w-full max-w-32 overflow-hidden rounded-lg border border-line bg-canvas">
                      {product.thumbnail ? (
                        <Image
                          src={product.thumbnail}
                          alt=""
                          width={128}
                          height={128}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="grid-plate block size-full" />
                      )}
                    </span>
                    {product.brand ? (
                      <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
                        {product.brand.name}
                      </span>
                    ) : null}
                    <span className="block font-semibold text-ink group-hover:underline">
                      {product.title}
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const differs = new Set(row.keys.filter((key) => key !== null)).size > 1;
              return (
                <tr key={row.label} className="border-t border-line">
                  <th
                    scope="row"
                    className={cn(
                      "p-3 text-left font-normal",
                      differs ? "text-ink" : "text-ink-faint"
                    )}
                  >
                    {row.label}
                  </th>
                  {row.values.map((value, index) => (
                    <td
                      key={index}
                      className={cn(
                        "p-3 align-top",
                        differs ? "font-medium text-ink" : "text-ink-soft"
                      )}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: products as cards */}
      <div className="space-y-5 md:hidden">
        {products.map((product, productIndex) => (
          <article key={product.id} className="rounded-xl border border-line bg-surface">
            <Link href={`/produkt/${product.handle}`} className="flex gap-3 p-4">
              <span className="size-16 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt=""
                    width={64}
                    height={64}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="grid-plate block size-full" />
                )}
              </span>
              <span>
                {product.brand ? (
                  <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
                    {product.brand.name}
                  </span>
                ) : null}
                <span className="block font-semibold text-ink">{product.title}</span>
              </span>
            </Link>

            <dl className="border-t border-line text-sm">
              {rows.map((row) => {
                const differs = new Set(row.keys.filter((key) => key !== null)).size > 1;
                return (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-4 border-b border-line px-4 py-2.5 last:border-0"
                  >
                    <dt className={differs ? "text-ink-soft" : "text-ink-faint"}>{row.label}</dt>
                    <dd
                      className={cn(
                        "text-right",
                        differs ? "font-medium text-ink" : "text-ink-soft"
                      )}
                    >
                      {row.values[productIndex]}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function buildRows(products: readonly ProductDetail[]): Row[] {
  const map = <T,>(project: (product: ProductDetail) => T): T[] => products.map(project);

  const rows: Row[] = [];

  const push = (
    label: string,
    project: (product: ProductDetail) => { node: React.ReactNode; key: string | null }
  ): void => {
    const cells = map(project);
    // A row where nobody has a value tells the customer nothing.
    if (cells.every((cell) => cell.key === null)) return;
    rows.push({
      label,
      values: cells.map((cell) => cell.node),
      keys: cells.map((cell) => cell.key),
    });
  };

  push("Pris", (product) => ({
    node: product.priceFrom ? formatMoney(product.priceFrom) : "—",
    key: product.priceFrom ? String(product.priceFrom.amount) : null,
  }));

  push("Pris/kg", (product) => ({
    node: product.pricePerKgFrom ? `${formatMoney(product.pricePerKgFrom)}/kg` : "—",
    key: product.pricePerKgFrom ? String(product.pricePerKgFrom.amount) : null,
  }));

  push("Materiale", (product) => ({
    node: product.material ? MATERIAL_LABELS[product.material] : "—",
    key: product.material,
  }));

  push("Finish", (product) => ({
    node: product.finish ? FINISH_LABELS[product.finish] : "—",
    key: product.finish,
  }));

  push("Spolevægt", (product) => {
    const weight = product.filament?.netFilamentWeightG ?? null;
    return { node: formatSpoolWeight(weight) ?? "—", key: weight === null ? null : String(weight) };
  });

  push("Diameter", (product) => {
    const diameter = product.filament?.diameterMm ?? null;
    return {
      node: diameter === null ? "—" : `${String(diameter).replace(".", ",")} mm`,
      key: diameter === null ? null : String(diameter),
    };
  });

  push("Dysetemp.", (product) => {
    const value = temperature(
      product.filament?.nozzleTemperature.min,
      product.filament?.nozzleTemperature.max
    );
    return { node: value ?? "—", key: value };
  });

  push("Bedtemp.", (product) => {
    const value = temperature(
      product.filament?.bedTemperature.min,
      product.filament?.bedTemperature.max
    );
    return { node: value ?? "—", key: value };
  });

  push("Tørring", (product) => {
    const drying = product.filament?.drying;
    if (!drying || drying.temperature === null) return { node: "—", key: null };
    const value = `${drying.temperature} °C${drying.durationHours ? ` / ${drying.durationHours} t` : ""}`;
    return { node: value, key: value };
  });

  push("Maks. flow", (product) => {
    const flow = product.filament?.maxVolumetricSpeed ?? null;
    return {
      node: flow === null ? "—" : `${flow} mm³/s`,
      key: flow === null ? null : String(flow),
    };
  });

  const ratings = [
    ["Printvenlighed", "printability"],
    ["Styrke", "strength"],
    ["Fleksibilitet", "flexibility"],
    ["Varmebestandighed", "heatResistance"],
    ["UV-bestandighed", "uvResistance"],
  ] as const;

  for (const [label, key] of ratings) {
    push(label, (product) => {
      const value = product.filament?.ratings[key];
      return {
        node: value === undefined ? "—" : <Dots value={value} />,
        key: value === undefined ? null : String(value),
      };
    });
  }

  push("AMS", (product) => {
    const value = product.filament?.amsCompatible ?? null;
    return { node: <TriState value={value} />, key: value === null ? null : String(value) };
  });

  push("Hærdet dyse", (product) => {
    const value = product.filament?.hardenedNozzleRecommended;
    return {
      node: value === undefined ? "—" : value ? "Påkrævet" : "Ikke nødvendig",
      key: value === undefined ? null : String(value),
    };
  });

  push("Lager", (product) => ({
    node: <StockIndicator status={product.stock} className="text-xs" />,
    key: product.stock,
  }));

  return rows;
}

function temperature(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (min === null || min === undefined) return max ? `${max} °C` : null;
  if (max === null || max === undefined) return `${min} °C`;
  return min === max ? `${min} °C` : `${min}–${max} °C`;
}

function Dots({ value }: { value: number }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${value} ud af 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", index < value ? "bg-accent" : "bg-line")}
        />
      ))}
    </span>
  );
}

function TriState({ value }: { value: boolean | null }): React.JSX.Element {
  if (value === null) return <span className="text-ink-faint">Ikke oplyst</span>;
  return value ? (
    <span className="inline-flex items-center gap-1 text-positive">
      <CheckIcon className="size-3.5" /> Ja
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-ink-soft">
      <XIcon className="size-3.5" /> Nej
    </span>
  );
}
