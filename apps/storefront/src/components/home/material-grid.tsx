import Link from "next/link";
import { MATERIAL_PROFILES } from "@nordprint/commerce";
import { TechLabel } from "@nordprint/ui";

/**
 * "Shop efter materiale".
 *
 * The copy comes from the same `MATERIAL_PROFILES` table the recommendation
 * engine scores against, so what the front page promises about PETG and what
 * /find-filament recommends can never drift apart.
 */
export function MaterialGrid(): React.JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {MATERIAL_PROFILES.map((profile) => (
        <li key={profile.material}>
          <Link
            href={`/filament?material=${profile.material}`}
            className="group flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-muted"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold tracking-tight text-ink">{profile.label}</span>
              <TechLabel>{"kr".repeat(profile.priceLevel)}</TechLabel>
            </div>

            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{profile.note}</p>

            <dl className="mt-4 space-y-1.5 border-t border-line pt-3">
              <Bar label="Nem at printe" value={profile.ratings.printability} />
              <Bar label="Styrke" value={profile.ratings.strength} />
              <Bar label="Varme" value={profile.ratings.heatResistance} />
            </dl>

            {profile.requiresEnclosure ? (
              <p className="mt-3 text-xs text-caution">Kræver lukket kabinet</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Bar({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-[6.5rem] shrink-0 text-xs text-ink-faint">{label}</dt>
      <dd className="flex flex-1 items-center gap-1" aria-label={`${label}: ${value} ud af 5`}>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`h-1 flex-1 rounded-full ${index < value ? "bg-accent" : "bg-line"}`}
          />
        ))}
      </dd>
    </div>
  );
}
