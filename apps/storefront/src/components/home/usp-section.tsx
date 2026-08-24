import { loadUsps } from "@nordprint/config";
import { USP_ICONS } from "@/components/icons";

/**
 * USP band.
 *
 * The promises are configuration (`NORDPRINT_USPS`), not markup — marketing
 * can change what the shop claims without a code deploy, and the claims stay
 * identical on the front page, in the cart and in the footer.
 */
export function UspSection(): React.JSX.Element {
  const usps = loadUsps();

  return (
    <section aria-label="Derfor NordPrint" className="border-y border-line bg-surface">
      <div className="container-page py-12">
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {usps.map((usp) => {
            const Icon = USP_ICONS[usp.icon] ?? USP_ICONS.shield!;
            return (
              <li key={usp.id} className="flex gap-3.5">
                <Icon className="size-6 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-semibold text-ink">{usp.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{usp.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
