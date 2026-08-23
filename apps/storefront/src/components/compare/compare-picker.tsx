"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { commerceConfig } from "@nordprint/config";
import { Button, EmptyState, buttonVariants } from "@nordprint/ui";
import { ScaleIcon, XIcon } from "@/components/icons";
import { usePreferences } from "@/lib/preferences/preferences-provider";

/**
 * Keeps the comparison URL and the customer's local selection in step.
 *
 * The URL wins when it has something in it — a shared link must show what the
 * sender saw. Otherwise the locally stored selection is pushed into the URL,
 * so arriving from the "Sammenlign" toggle on a product card just works.
 */
export function ComparePicker({
  handles,
}: {
  readonly handles: readonly string[];
}): React.JSX.Element | null {
  const router = useRouter();
  const { compare, ready, toggleCompare, clearCompare } = usePreferences();

  const urlHandles = React.useMemo(() => handles.join(","), [handles]);
  const localHandles = React.useMemo(() => compare.join(","), [compare]);

  React.useEffect(() => {
    if (!ready) return;
    if (urlHandles.length > 0) return;
    if (localHandles.length === 0) return;
    router.replace(`/sammenlign?produkter=${encodeURIComponent(localHandles)}`);
  }, [ready, urlHandles, localHandles, router]);

  if (handles.length === 0) {
    return (
      <EmptyState
        icon={<ScaleIcon className="size-8" />}
        title="Ingen produkter valgt"
        description={`Vælg "Sammenlign" på op til ${commerceConfig.maxCompareItems} produkter, så stiller vi dem op side om side her.`}
        action={
          <Link href="/filament" className={buttonVariants({})}>
            Find filament at sammenligne
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-soft">
        {handles.length} af {commerceConfig.maxCompareItems} valgt:
      </span>

      {handles.map((handle) => (
        <button
          key={handle}
          type="button"
          onClick={() => {
            toggleCompare(handle);
            const next = handles.filter((entry) => entry !== handle);
            router.replace(
              next.length > 0
                ? `/sammenlign?produkter=${encodeURIComponent(next.join(","))}`
                : "/sammenlign"
            );
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink transition-colors hover:border-negative/40 hover:text-negative"
        >
          {handle}
          <XIcon className="size-3" />
          <span className="sr-only">Fjern fra sammenligning</span>
        </button>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          clearCompare();
          router.replace("/sammenlign");
        }}
      >
        Ryd alle
      </Button>
    </div>
  );
}
