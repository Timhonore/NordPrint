import { Skeleton } from "@nordprint/ui";

/**
 * Route-level loading state.
 *
 * Skeletons shaped like the content that follows, so the page does not jump
 * when the real thing arrives.
 */
export default function Loading(): React.JSX.Element {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Indlæser">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />

      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-line bg-surface">
            <Skeleton className="aspect-square rounded-none" />
            <div className="space-y-2.5 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
