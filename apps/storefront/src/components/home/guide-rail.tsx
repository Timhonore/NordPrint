import Link from "next/link";
import Image from "next/image";
import type { GuideSummary } from "@nordprint/types";
import { TechLabel } from "@nordprint/ui";

export function GuideRail({
  guides,
}: {
  readonly guides: readonly GuideSummary[];
}): React.JSX.Element {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {guides.map((guide) => (
        <li key={guide.id}>
          <Link
            href={`/guides/${guide.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-[0_12px_28px_-20px_rgb(13_17_23/0.5)]"
          >
            <div className="relative aspect-[16/9] overflow-hidden bg-canvas">
              {guide.heroImageUrl ? (
                <Image
                  src={guide.heroImageUrl}
                  alt={guide.heroImageAlt ?? ""}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="grid-plate size-full" />
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              <TechLabel>{guide.readingMinutes} min læsning</TechLabel>
              <h3 className="mt-2 text-base font-semibold leading-snug text-ink">{guide.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-soft">
                {guide.intro}
              </p>
              <span className="mt-4 text-sm font-medium text-accent group-hover:underline">
                Læs guiden →
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
