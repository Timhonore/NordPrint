import { Badge, EmptyState, StarRating, TechLabel } from "@nordprint/ui";
import type { ReviewSummary } from "@nordprint/types";
import { apiFetch, orFallback } from "@/lib/api/client";

interface PublishedReview {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

const EMPTY: { summary: ReviewSummary; reviews: PublishedReview[] } = {
  summary: { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  reviews: [],
};

/**
 * Product reviews.
 *
 * Only approved reviews are ever returned by the backend, and "Verificeret
 * køb" is derived server-side from a real order — it is not something a
 * reviewer can claim for themselves.
 */
export async function ProductReviews({
  productId,
  className,
}: {
  readonly productId: string;
  readonly className?: string;
}): Promise<React.JSX.Element> {
  const result = await apiFetch<typeof EMPTY>(
    `/store/nordprint/reviews/${encodeURIComponent(productId)}?limit=6`,
    { revalidate: 120 }
  );
  const { summary, reviews } = orFallback(result, EMPTY);

  return (
    <section className={className} aria-labelledby="anmeldelser">
      <TechLabel>Fra kunderne</TechLabel>
      <h2 id="anmeldelser" className="mb-5 mt-1.5 text-xl font-bold tracking-tight">
        Anmeldelser
      </h2>

      {reviews.length === 0 ? (
        <EmptyState
          title="Ingen anmeldelser endnu"
          description="Har du printet med den? Vi vil gerne høre, hvordan det gik — anmeldelser gennemlæses, før de vises."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-3xl font-bold tabular-nums">
              {summary.average?.toFixed(1).replace(".", ",") ?? "—"}
            </p>
            <StarRating value={summary.average} count={summary.count} className="mt-1" />

            <dl className="mt-4 space-y-1.5">
              {([5, 4, 3, 2, 1] as const).map((stars) => {
                const count = summary.distribution[stars];
                const share = summary.count > 0 ? (count / summary.count) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <dt className="w-8 shrink-0 text-ink-faint tabular-nums">{stars} ★</dt>
                    <dd className="flex flex-1 items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                        <span
                          className="block h-full bg-amber"
                          style={{ width: `${share}%` }}
                        />
                      </span>
                      <span className="w-5 shrink-0 text-right text-ink-faint tabular-nums">
                        {count}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <ul className="space-y-5">
            {reviews.map((review) => (
              <li key={review.id} className="border-b border-line pb-5 last:border-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <StarRating value={review.rating} />
                  {review.verifiedPurchase ? (
                    <Badge tone="positive">Verificeret køb</Badge>
                  ) : null}
                  <span className="text-xs text-ink-faint">
                    {new Intl.DateTimeFormat("da-DK", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(new Date(review.createdAt))}
                  </span>
                </div>

                {review.title ? (
                  <p className="mt-2 font-semibold text-ink">{review.title}</p>
                ) : null}
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {review.body}
                </p>
                <p className="mt-2 text-xs text-ink-faint">— {review.authorName}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
