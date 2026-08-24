"use client";

import * as React from "react";
import Link from "next/link";
import { VisuallyHidden, cn } from "@nordprint/ui";
import { ScaleIcon } from "@/components/icons";
import { usePreferences } from "@/lib/preferences/preferences-provider";

/**
 * Comparison toggle.
 *
 * The comparison list is a handful of product handles in local storage; the
 * `/sammenlign` page fetches the real data server-side. That keeps the toggle
 * instant and the comparison table authoritative.
 */
export function CompareToggle({
  handle,
  title,
  className,
}: {
  readonly handle: string;
  readonly title: string;
  readonly className?: string;
}): React.JSX.Element {
  const { isComparing, toggleCompare, compare, ready } = usePreferences();
  const active = ready && isComparing(handle);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => toggleCompare(handle)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors",
          active ? "text-accent" : "text-ink-faint hover:text-ink"
        )}
      >
        <ScaleIcon className="size-3.5" />
        <span aria-hidden="true">{active ? "Valgt" : "Sammenlign"}</span>
        <VisuallyHidden>
          {active ? `Fjern ${title} fra sammenligning` : `Sammenlign ${title}`}
        </VisuallyHidden>
      </button>

      {active && compare.length > 1 ? (
        <Link href="/sammenlign" className="text-xs font-medium text-accent hover:underline">
          ({compare.length})
        </Link>
      ) : null}
    </span>
  );
}
