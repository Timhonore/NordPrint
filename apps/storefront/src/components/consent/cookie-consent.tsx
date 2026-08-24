"use client";

import * as React from "react";
import Link from "next/link";
import { Button, cn } from "@nordprint/ui";

/**
 * Cookie consent.
 *
 * The rules this implements, rather than gestures at:
 *
 *  - Nothing beyond strictly necessary cookies is set before a choice is made.
 *    "Afvis" is as prominent and as easy as "Accepter" — a dark-patterned
 *    banner is not consent.
 *  - Analytics and marketing default to **off**. There is no pre-ticked box.
 *  - The choice is stored with a timestamp and a version, so a change to what
 *    we use cookies for re-asks instead of relying on stale consent.
 *  - The decision is revocable from the footer at any time.
 *
 * Scripts read `hasConsent(category)` before loading; nothing is injected here.
 */
const STORAGE_KEY = "nordprint.consent.v1";
/** Bumping this re-asks everyone — do it when the cookie purposes change. */
const POLICY_VERSION = 1;
const CONSENT_MAX_AGE_DAYS = 180;

export interface ConsentState {
  readonly necessary: true;
  readonly analytics: boolean;
  readonly marketing: boolean;
  readonly version: number;
  readonly decidedAt: string;
}

function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== POLICY_VERSION) return null;

    const ageDays = (Date.now() - new Date(parsed.decidedAt).getTime()) / 86_400_000;
    if (!Number.isFinite(ageDays) || ageDays > CONSENT_MAX_AGE_DAYS) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Exposed as an external store so React can read the decision with
 * `useSyncExternalStore` — no hydration effect, and therefore no banner
 * flashing for visitors who already chose.
 */
const consentListeners = new Set<() => void>();
let consentSnapshot: ConsentState | null = null;
let consentHydrated = false;

function subscribeConsent(listener: () => void): () => void {
  if (!consentHydrated) {
    consentHydrated = true;
    consentSnapshot = readConsent();
  }
  consentListeners.add(listener);
  return () => consentListeners.delete(listener);
}

const getConsentSnapshot = (): ConsentState | null => consentSnapshot;
/** The server cannot know, so it renders as "not yet decided" and shows nothing. */
const getConsentServerSnapshot = (): ConsentState | null => null;

function writeConsent(state: Omit<ConsentState, "version" | "decidedAt" | "necessary">): void {
  const value: ConsentState = {
    necessary: true,
    ...state,
    version: POLICY_VERSION,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked. Without persistence we must keep treating the visitor
    // as undecided, which means no analytics — the safe direction.
  }
  consentSnapshot = value;
  for (const listener of consentListeners) listener();
  window.dispatchEvent(new CustomEvent("nordprint:consent-changed", { detail: value }));
}

/** Read by any script that needs a legal basis before it loads. */
export function hasConsent(category: "analytics" | "marketing"): boolean {
  return readConsent()?.[category] === true;
}

export function CookieConsent(): React.JSX.Element | null {
  const decision = React.useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );
  const [reopened, setReopened] = React.useState(false);
  const [detailed, setDetailed] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);

  React.useEffect(() => {
    const onReopen = (): void => {
      setReopened(true);
      setDetailed(true);
    };
    window.addEventListener("nordprint:open-consent", onReopen);
    return () => window.removeEventListener("nordprint:open-consent", onReopen);
  }, []);

  // Shown when the visitor has not decided yet, or asked to change their mind.
  const visible = decision === null || reopened;
  if (!visible) return null;

  const decide = (next: { analytics: boolean; marketing: boolean }): void => {
    writeConsent(next);
    setReopened(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="samtykke-titel"
      className="fixed inset-x-0 bottom-0 z-[90] animate-rise border-t border-line bg-surface p-4 shadow-[0_-12px_32px_-24px_rgb(13_17_23/0.4)] sm:inset-x-4 sm:bottom-4 sm:max-w-lg sm:rounded-xl sm:border"
    >
      <h2 id="samtykke-titel" className="text-base font-semibold text-ink">
        Cookies på NordPrint
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        Vi bruger nødvendige cookies, for at kurven og login virker. Statistik og markedsføring
        bruger vi kun, hvis du siger ja.{" "}
        <Link href="/cookies" className="font-medium text-accent hover:underline">
          Læs mere
        </Link>
        .
      </p>

      {detailed ? (
        <div className="mt-4 space-y-2.5 border-t border-line pt-4">
          <ConsentRow
            title="Nødvendige"
            description="Kurv, login og sikkerhed. Kan ikke fravælges."
            checked
            disabled
          />
          <ConsentRow
            title="Statistik"
            description="Hjælper os med at se, hvilke sider der virker."
            checked={analytics}
            onChange={setAnalytics}
          />
          <ConsentRow
            title="Markedsføring"
            description="Bruges til at måle og målrette annoncer."
            checked={marketing}
            onChange={setMarketing}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {detailed ? (
          <Button full onClick={() => decide({ analytics, marketing })}>
            Gem mit valg
          </Button>
        ) : (
          <Button full onClick={() => decide({ analytics: true, marketing: true })}>
            Accepter alle
          </Button>
        )}

        {/* Same size, same weight, same prominence as accept. */}
        <Button
          full
          variant="secondary"
          onClick={() => decide({ analytics: false, marketing: false })}
        >
          Kun nødvendige
        </Button>

        {!detailed ? (
          <Button full variant="ghost" onClick={() => setDetailed(true)}>
            Tilpas
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ConsentRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}): React.JSX.Element {
  return (
    <label className={cn("flex items-start gap-3", disabled && "opacity-60")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-line accent-[--color-accent]"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-soft">{description}</span>
      </span>
    </label>
  );
}

/** Footer entry point — lets a visitor change their mind. */
export function ReopenConsentButton(): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("nordprint:open-consent"))}
      className="underline-offset-2 hover:underline"
    >
      Cookieindstillinger
    </button>
  );
}
