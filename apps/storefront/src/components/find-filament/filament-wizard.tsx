"use client";

import * as React from "react";
import Link from "next/link";
import type {
  ColorFamily,
  PrintIntent,
  Priority,
  Recommendation,
} from "@nordprint/types";
import {
  COLOR_FAMILY_LABELS,
  PRINT_INTENTS,
  PRINT_INTENT_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
} from "@nordprint/types";
import { Badge, Button, EmptyState, TechLabel, buttonVariants, cn } from "@nordprint/ui";
import { ProductCard } from "@/components/catalog/product-card";
import { usePreferences } from "@/lib/preferences/preferences-provider";
import type { PrinterTree } from "@/lib/api/catalog";
import { CheckIcon, SparklesIcon } from "@/components/icons";

/**
 * The guided filament selector.
 *
 * Four steps, all optional except the ones that change the answer. The
 * customer's saved printer pre-fills step 1, so a returning customer answers
 * three questions rather than four.
 *
 * Every recommendation arrives with the reasons that produced it. That is the
 * whole point: a suggestion the customer cannot evaluate is a suggestion they
 * will not act on, and it is also the thing that makes swapping in an
 * AI-backed engine later a change of implementation rather than of trust.
 */
const SWATCH_COLORS: { family: ColorFamily; hex: string }[] = [
  { family: "black", hex: "#141414" },
  { family: "white", hex: "#f2f2ef" },
  { family: "grey", hex: "#7a8189" },
  { family: "red", hex: "#c0392b" },
  { family: "orange", hex: "#e67e22" },
  { family: "yellow", hex: "#e8b71a" },
  { family: "green", hex: "#1e7d4f" },
  { family: "blue", hex: "#1f6feb" },
  { family: "purple", hex: "#6b3fa0" },
  { family: "transparent", hex: "#dfe7ea" },
  { family: "gold", hex: "#c8a24a" },
  { family: "silver", hex: "#b8bfc4" },
];

interface WizardState {
  printerModelId: string | null;
  intents: PrintIntent[];
  priorities: Priority[];
  colorFamily: ColorFamily | null;
}

export function FilamentWizard({
  printerBrands,
}: {
  readonly printerBrands: PrinterTree["brands"];
}): React.JSX.Element {
  const { primaryPrinter, ready } = usePreferences();

  const [state, setState] = React.useState<WizardState>({
    printerModelId: null,
    intents: [],
    priorities: [],
    colorFamily: null,
  });
  const [step, setStep] = React.useState(0);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = React.useState<{
    recommendations: Recommendation[];
    printerName: string | null;
  } | null>(null);

  // Pre-fill from the saved printer once, without overriding a manual choice.
  const [prefilled, setPrefilled] = React.useState(false);
  if (ready && !prefilled && primaryPrinter && state.printerModelId === null) {
    setPrefilled(true);
    setState((current) => ({ ...current, printerModelId: primaryPrinter.modelId }));
  }

  const toggle = <K extends "intents" | "priorities">(key: K, value: string): void => {
    setState((current) => {
      const list = current[key] as string[];
      return {
        ...current,
        [key]: list.includes(value)
          ? list.filter((entry) => entry !== value)
          : [...list, value],
      } as WizardState;
    });
  };

  const submit = async (): Promise<void> => {
    setStatus("loading");
    setResult(null);

    try {
      const response = await fetch("/api/anbefalinger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!response.ok) throw new Error("recommendation failed");

      setResult((await response.json()) as typeof result);
      setStatus("idle");
      setStep(4);
    } catch {
      setStatus("error");
    }
  };

  const reset = (): void => {
    setState({ printerModelId: null, intents: [], priorities: [], colorFamily: null });
    setResult(null);
    setStep(0);
    setStatus("idle");
  };

  if (step === 4) {
    return (
      <ResultView
        result={result}
        status={status}
        onRestart={reset}
        onBack={() => setStep(3)}
      />
    );
  }

  const steps = [
    {
      title: "Hvilken printer har du?",
      hint: "Vi bruger den til at udelukke materialer, din maskine ikke kan klare.",
      optional: true,
      body: (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setState((current) => ({ ...current, printerModelId: null }))}
            className={cn(
              "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
              state.printerModelId === null
                ? "border-accent bg-accent-soft"
                : "border-line hover:bg-surface-muted"
            )}
          >
            <span className="font-medium">Spring over</span>
            <span className="mt-0.5 block text-ink-soft">
              Vis anbefalinger uden at tage hensyn til printer
            </span>
          </button>

          {printerBrands.map((brandEntry) => (
            <div key={brandEntry.id}>
              <TechLabel className="mb-2 block">{brandEntry.name}</TechLabel>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {brandEntry.families.flatMap((family) =>
                  family.models.map((model) => (
                    <Choice
                      key={model.id}
                      selected={state.printerModelId === model.id}
                      onClick={() =>
                        setState((current) => ({ ...current, printerModelId: model.id }))
                      }
                      label={model.name}
                      hint={[
                        model.enclosed ? "Lukket" : "Åben",
                        model.hardenedNozzleStock ? "hærdet dyse" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Hvad vil du printe?",
      hint: "Vælg gerne flere.",
      optional: false,
      body: (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PRINT_INTENTS.map((intent) => (
            <Choice
              key={intent}
              selected={state.intents.includes(intent)}
              onClick={() => toggle("intents", intent)}
              label={PRINT_INTENT_LABELS[intent]}
            />
          ))}
        </div>
      ),
    },
    {
      title: "Hvad er vigtigst?",
      hint: "Vælg op til tre — jo færre, jo skarpere bliver anbefalingen.",
      optional: false,
      body: (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PRIORITIES.map((priority) => (
            <Choice
              key={priority}
              selected={state.priorities.includes(priority)}
              onClick={() => toggle("priorities", priority)}
              label={PRIORITY_LABELS[priority]}
            />
          ))}
        </div>
      ),
    },
    {
      title: "Ønsket farve",
      hint: "Vi prioriterer produkter, der findes i farven og er på lager.",
      optional: true,
      body: (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setState((current) => ({ ...current, colorFamily: null }))}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm transition-colors",
              state.colorFamily === null
                ? "border-accent bg-accent-soft"
                : "border-line hover:bg-surface-muted"
            )}
          >
            Ligegyldigt
          </button>
          {SWATCH_COLORS.map((color) => (
            <button
              key={color.family}
              type="button"
              aria-pressed={state.colorFamily === color.family}
              onClick={() =>
                setState((current) => ({
                  ...current,
                  colorFamily: current.colorFamily === color.family ? null : color.family,
                }))
              }
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                state.colorFamily === color.family
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:bg-surface-muted"
              )}
            >
              <span
                aria-hidden="true"
                style={{ background: color.hex }}
                className="size-4 rounded-full ring-1 ring-inset ring-black/10"
              />
              {COLOR_FAMILY_LABELS[color.family]}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step]!;
  const canContinue = current.optional || (step === 1 ? state.intents.length > 0 : true);

  return (
    <div className="mx-auto max-w-4xl">
      <ol className="mb-8 flex items-center gap-2">
        {steps.map((entry, index) => (
          <li key={entry.title} className="flex flex-1 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= step ? "bg-accent" : "bg-line"
              )}
            />
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-line bg-surface p-6 md:p-8">
        <TechLabel>
          Trin {step + 1} af {steps.length}
        </TechLabel>
        <h2 className="mt-2 text-xl font-bold tracking-tight md:text-2xl">{current.title}</h2>
        <p className="mt-1.5 text-sm text-ink-soft">{current.hint}</p>

        <div className="mt-6">{current.body}</div>

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Tilbage
            </Button>
          ) : null}

          {step < steps.length - 1 ? (
            <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>
              Næste
            </Button>
          ) : (
            <Button size="lg" disabled={status === "loading"} onClick={() => void submit()}>
              {status === "loading" ? "Finder …" : "Vis anbefalinger"}
            </Button>
          )}

          {current.optional && step < steps.length - 1 ? (
            <Button variant="ghost" onClick={() => setStep(step + 1)}>
              Spring over
            </Button>
          ) : null}
        </div>

        {!canContinue ? (
          <p className="mt-3 text-sm text-ink-faint">Vælg mindst én mulighed for at gå videre.</p>
        ) : null}
      </div>
    </div>
  );
}

function Choice({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex items-start justify-between gap-2 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors",
        selected ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-muted"
      )}
    >
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-faint">{hint}</span> : null}
      </span>
      {selected ? <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" /> : null}
    </button>
  );
}

function ResultView({
  result,
  status,
  onRestart,
  onBack,
}: {
  result: { recommendations: Recommendation[]; printerName: string | null } | null;
  status: "idle" | "loading" | "error";
  onRestart: () => void;
  onBack: () => void;
}): React.JSX.Element {
  if (status === "error") {
    return (
      <EmptyState
        title="Anbefalingerne kunne ikke hentes"
        description="Der var et problem med forbindelsen."
        action={<Button onClick={onBack}>Prøv igen</Button>}
      />
    );
  }

  const recommendations = result?.recommendations ?? [];

  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={<SparklesIcon className="size-8" />}
        title="Vi fandt ikke et oplagt match"
        description="Prøv med færre krav — eller kig hele filamentsortimentet igennem."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={onRestart}>
              Start forfra
            </Button>
            <Link href="/filament" className={buttonVariants({})}>
              Se alt filament
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <TechLabel>Resultat</TechLabel>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">Vi anbefaler</h2>
          {result?.printerName ? (
            <p className="mt-1.5 text-ink-soft">
              Udvalgt til din <strong className="font-medium text-ink">{result.printerName}</strong>
            </p>
          ) : null}
        </div>
        <Button variant="secondary" onClick={onRestart}>
          Start forfra
        </Button>
      </div>

      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((entry, index) => (
          <li key={entry.product.id} className="flex flex-col gap-3">
            <div className="relative">
              {index === 0 ? (
                <Badge tone="accent" className="absolute -top-2 left-3 z-10">
                  Bedste match
                </Badge>
              ) : null}
              <ProductCard product={entry.product} priority={index < 3} />
            </div>

            {entry.reasons.length > 0 ? (
              <div className="rounded-lg bg-surface-muted p-3.5">
                <TechLabel className="mb-2 block">Derfor</TechLabel>
                <ul className="space-y-1">
                  {entry.reasons.slice(0, 4).map((reason) => (
                    <li
                      key={reason.code}
                      className="flex items-start gap-2 text-sm text-ink-soft"
                    >
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-positive" />
                      {reason.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
