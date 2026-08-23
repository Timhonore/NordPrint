import type { FreeShippingProgress } from "@nordprint/types";
import { formatMoney } from "@nordprint/commerce";
import { CheckIcon, TruckIcon } from "@/components/icons";

/**
 * "Du mangler 151 kr for fri fragt".
 *
 * The threshold comes from the cart summary, which gets it from
 * `@nordprint/config` — changing `NORDPRINT_FREE_SHIPPING_THRESHOLD` moves
 * this bar, the header strip and what checkout actually charges, together.
 */
export function FreeShippingMeter({
  progress,
}: {
  readonly progress: FreeShippingProgress;
}): React.JSX.Element | null {
  if (!progress.enabled) return null;

  return (
    <div>
      <p className="flex items-center gap-2 text-sm">
        {progress.qualified ? (
          <>
            <CheckIcon className="size-4 shrink-0 text-positive" />
            <span className="font-medium text-positive">Du har fri fragt</span>
          </>
        ) : (
          <>
            <TruckIcon className="size-4 shrink-0 text-ink-faint" />
            <span className="text-ink-soft">
              Du mangler{" "}
              <strong className="font-semibold text-ink tabular-nums">
                {formatMoney(progress.remaining)}
              </strong>{" "}
              for fri fragt
            </span>
          </>
        )}
      </p>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.ratio * 100)}
        aria-label="Fremdrift mod fri fragt"
      >
        <div
          className={progress.qualified ? "h-full bg-positive" : "h-full bg-accent"}
          style={{ width: `${Math.round(progress.ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
