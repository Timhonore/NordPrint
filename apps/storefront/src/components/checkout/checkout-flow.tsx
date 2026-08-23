"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CartSummary, PickupPoint, ShippingOption } from "@nordprint/types";
import { DELIVERY_KIND_LABELS } from "@nordprint/types";
import { formatMoney } from "@nordprint/commerce";
import { Badge, Button, TechLabel, cn } from "@nordprint/ui";
import {
  completeOrder,
  initiatePayment,
  listPickupPoints,
  saveContactAndAddress,
  selectShippingMethod,
  type CheckoutResult,
  type PaymentMethodOption,
} from "@/lib/checkout/actions";
import { AlertIcon, CheckIcon } from "@/components/icons";

type Step = "contact" | "delivery" | "payment" | "confirm";

const STEPS: { id: Step; label: string }[] = [
  { id: "contact", label: "Kontakt" },
  { id: "delivery", label: "Levering" },
  { id: "payment", label: "Betaling" },
  { id: "confirm", label: "Bekræft" },
];

/**
 * The four-step checkout.
 *
 * One page, one form per step, and each completed step collapses to a summary
 * line the customer can reopen. That keeps the whole order visible without
 * four page loads — and means a validation error never loses what they typed
 * in a different step.
 */
export function CheckoutFlow({
  cart,
  shippingOptions,
  paymentMethods,
}: {
  readonly cart: CartSummary;
  readonly shippingOptions: readonly ShippingOption[];
  readonly paymentMethods: readonly PaymentMethodOption[];
}): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("contact");
  const [done, setDone] = React.useState<Set<Step>>(new Set());
  const [contact, setContact] = React.useState<{ email: string; postalCode: string } | null>(null);
  const [shipping, setShipping] = React.useState<{
    option: ShippingOption;
    pickupPoint: PickupPoint | null;
  } | null>(null);
  const [payment, setPayment] = React.useState<PaymentMethodOption | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [placing, setPlacing] = React.useState(false);

  const complete = (current: Step, next: Step): void => {
    setDone((previous) => new Set(previous).add(current));
    setStep(next);
    setError(null);
  };

  return (
    <div className="space-y-3">
      <StepNav steps={STEPS} current={step} done={done} onSelect={setStep} />

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-negative/25 bg-negative/5 px-4 py-3 text-sm text-negative"
        >
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <StepPanel
        id="contact"
        title="Kontakt og adresse"
        step={step}
        done={done}
        summary={contact ? `${contact.email} · ${contact.postalCode}` : null}
        onOpen={() => setStep("contact")}
      >
        <ContactStep
          onDone={(values) => {
            setContact(values);
            complete("contact", "delivery");
          }}
        />
      </StepPanel>

      <StepPanel
        id="delivery"
        title="Levering"
        step={step}
        done={done}
        summary={
          shipping
            ? `${shipping.option.name}${shipping.pickupPoint ? ` — ${shipping.pickupPoint.name}` : ""}`
            : null
        }
        onOpen={() => setStep("delivery")}
      >
        <DeliveryStep
          options={shippingOptions}
          postalCode={contact?.postalCode ?? ""}
          onError={setError}
          onDone={(selection) => {
            setShipping(selection);
            complete("delivery", "payment");
            router.refresh();
          }}
        />
      </StepPanel>

      <StepPanel
        id="payment"
        title="Betaling"
        step={step}
        done={done}
        summary={payment?.label ?? null}
        onOpen={() => setStep("payment")}
      >
        <PaymentStep
          methods={paymentMethods}
          onError={setError}
          onDone={(method) => {
            setPayment(method);
            complete("payment", "confirm");
          }}
        />
      </StepPanel>

      <StepPanel
        id="confirm"
        title="Bekræft ordre"
        step={step}
        done={done}
        summary={null}
        onOpen={() => setStep("confirm")}
      >
        <div className="space-y-4">
          <dl className="space-y-2 text-sm">
            <SummaryRow label="E-mail" value={contact?.email ?? "—"} />
            <SummaryRow label="Levering" value={shipping?.option.name ?? "—"} />
            {shipping?.pickupPoint ? (
              <SummaryRow
                label="Pakkeshop"
                value={`${shipping.pickupPoint.name}, ${shipping.pickupPoint.address1}`}
              />
            ) : null}
            <SummaryRow label="Betaling" value={payment?.label ?? "—"} />
            <SummaryRow label="Total" value={formatMoney(cart.total)} strong />
          </dl>

          {payment?.isDevelopmentStub ? (
            <p className="rounded-lg border border-caution/30 bg-caution/5 px-3 py-2.5 text-sm text-caution">
              Testbetaling: der bliver ikke trukket penge, og ordren er ikke rigtig.
            </p>
          ) : null}

          <Button
            size="lg"
            full
            disabled={placing || !payment || !shipping}
            onClick={async () => {
              setPlacing(true);
              setError(null);
              const result = await completeOrder();
              // A successful completion redirects, so reaching this line at
              // all means it failed.
              setPlacing(false);
              if (!result.ok) setError(result.message ?? "Ordren kunne ikke gennemføres.");
            }}
          >
            {placing ? "Gennemfører …" : `Betal ${formatMoney(cart.total)}`}
          </Button>
        </div>
      </StepPanel>
    </div>
  );
}

/* ----------------------------------------------------------------- steps */

function ContactStep({
  onDone,
}: {
  onDone: (values: { email: string; postalCode: string }) => void;
}): React.JSX.Element {
  const [result, setResult] = React.useState<CheckoutResult | null>(null);
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);

    const response = await saveContactAndAddress(null, formData);
    setResult(response);
    setPending(false);

    if (response.ok) {
      onDone({
        email: String(formData.get("email") ?? ""),
        postalCode: String(formData.get("postalCode") ?? ""),
      });
    }
  };

  const errors = result?.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-ink-soft">
        Du behøver ikke en konto for at handle. Vi bruger kun oplysningerne til at sende
        pakken og din ordrebekræftelse.
      </p>

      <Field name="email" label="E-mail" type="email" autoComplete="email" error={errors.email} required />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label="Fornavn" autoComplete="given-name" error={errors.firstName} required />
        <Field name="lastName" label="Efternavn" autoComplete="family-name" error={errors.lastName} required />
      </div>

      <Field name="phone" label="Telefon" type="tel" autoComplete="tel" error={errors.phone} hint="Fragtfirmaet sender dig en sms" required />

      <Field name="address1" label="Adresse" autoComplete="address-line1" error={errors.address1} required />
      <Field name="address2" label="Adresse 2 (valgfri)" autoComplete="address-line2" />
      <Field name="company" label="Firma (valgfri)" autoComplete="organization" />

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field
          name="postalCode"
          label="Postnummer"
          autoComplete="postal-code"
          inputMode="numeric"
          error={errors.postalCode}
          required
        />
        <Field name="city" label="By" autoComplete="address-level2" error={errors.city} required />
      </div>

      <div>
        <label htmlFor="countryCode" className="block text-sm font-medium text-ink">
          Land
        </label>
        <select
          id="countryCode"
          name="countryCode"
          defaultValue="dk"
          autoComplete="country"
          className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="dk">Danmark</option>
        </select>
      </div>

      <Button type="submit" size="lg" full disabled={pending}>
        {pending ? "Gemmer …" : "Fortsæt til levering"}
      </Button>
    </form>
  );
}

function DeliveryStep({
  options,
  postalCode,
  onDone,
  onError,
}: {
  options: readonly ShippingOption[];
  postalCode: string;
  onDone: (selection: { option: ShippingOption; pickupPoint: PickupPoint | null }) => void;
  onError: (message: string | null) => void;
}): React.JSX.Element {
  const [selectedId, setSelectedId] = React.useState<string | null>(options[0]?.id ?? null);
  const [pointsByCarrier, setPointsByCarrier] = React.useState<Record<string, PickupPoint[]>>({});
  const [pointId, setPointId] = React.useState<string | null>(null);
  const [loadingPoints, setLoadingPoints] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const selected = options.find((option) => option.id === selectedId) ?? null;
  const needsPoints = Boolean(selected?.requiresPickupPoint) && postalCode.length === 4;

  // Points are keyed by carrier, so switching back to a carrier already looked
  // up is instant and the list is derived rather than reset in an effect.
  const points = needsPoints && selected ? (pointsByCarrier[selected.carrierId] ?? []) : [];

  // Pickup points depend on both the carrier and the postcode, so they are
  // fetched when either changes rather than once up front.
  React.useEffect(() => {
    if (!needsPoints || !selected) return;
    if (pointsByCarrier[selected.carrierId]) return;

    const carrierId = selected.carrierId;
    let cancelled = false;

    void (async () => {
      setLoadingPoints(true);
      const result = await listPickupPoints(postalCode, carrierId);
      if (cancelled) return;
      setPointsByCarrier((current) => ({ ...current, [carrierId]: result }));
      setLoadingPoints(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [needsPoints, selected, postalCode, pointsByCarrier]);

  // Default to the nearest shop once a list arrives, and drop a stale choice
  // when the carrier changes.
  const validPointId: string | null =
    pointId !== null && points.some((entry) => entry.id === pointId)
      ? pointId
      : (points[0]?.id ?? null);
  if (validPointId !== pointId) setPointId(validPointId);

  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-caution/30 bg-caution/5 px-4 py-3 text-sm text-caution">
        Fragtpriser kunne ikke hentes lige nu.{" "}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="font-medium underline"
        >
          Prøv igen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="sr-only">Leveringsmetode</legend>
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors",
                option.id === selectedId
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:bg-surface-muted"
              )}
            >
              <input
                type="radio"
                name="shipping"
                value={option.id}
                checked={option.id === selectedId}
                onChange={() => setSelectedId(option.id)}
                className="mt-1 size-4 accent-[--color-accent]"
              />
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{option.name}</span>
                  <Badge tone="outline">{DELIVERY_KIND_LABELS[option.kind]}</Badge>
                </span>
                {option.estimatedDeliveryDays !== null ? (
                  <span className="mt-0.5 block text-sm text-ink-soft">
                    {option.estimatedDeliveryDays} hverdage
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {option.price.amount === 0 ? "Gratis" : formatMoney(option.price)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {selected?.requiresPickupPoint ? (
        <div>
          <TechLabel className="mb-2 block">Vælg pakkeshop nær {postalCode}</TechLabel>

          {loadingPoints ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : points.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Vi fandt ingen pakkeshops på postnummer {postalCode}. Vælg hjemmelevering i
              stedet.
            </p>
          ) : (
            <ul className="space-y-2">
              {points.map((point) => (
                <li key={point.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      point.id === validPointId
                        ? "border-accent bg-accent-soft"
                        : "border-line hover:bg-surface-muted"
                    )}
                  >
                    <input
                      type="radio"
                      name="pickupPoint"
                      value={point.id}
                      checked={point.id === validPointId}
                      onChange={() => setPointId(point.id)}
                      className="mt-1 size-4 accent-[--color-accent]"
                    />
                    <span className="flex-1 text-sm">
                      <span className="block font-medium text-ink">{point.name}</span>
                      <span className="block text-ink-soft">
                        {point.address1}, {point.postalCode} {point.city}
                      </span>
                      {point.distanceMeters !== null ? (
                        <span className="block text-xs text-ink-faint">
                          {(point.distanceMeters / 1000).toFixed(1).replace(".", ",")} km herfra
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <Button
        size="lg"
        full
        disabled={pending || !selected || (selected.requiresPickupPoint && !validPointId)}
        onClick={async () => {
          if (!selected) return;
          setPending(true);
          onError(null);

          const point = points.find((entry) => entry.id === validPointId) ?? null;
          const result = await selectShippingMethod({
            optionId: selected.id,
            pickupPointId: point?.id ?? null,
            pickupPointName: point?.name ?? null,
          });

          setPending(false);
          if (!result.ok) {
            onError(result.message ?? "Leveringen kunne ikke vælges.");
            return;
          }
          onDone({ option: selected, pickupPoint: point });
        }}
      >
        {pending ? "Gemmer …" : "Fortsæt til betaling"}
      </Button>
    </div>
  );
}

function PaymentStep({
  methods,
  onDone,
  onError,
}: {
  methods: readonly PaymentMethodOption[];
  onDone: (method: PaymentMethodOption) => void;
  onError: (message: string | null) => void;
}): React.JSX.Element {
  const [selectedId, setSelectedId] = React.useState<string | null>(methods[0]?.id ?? null);
  const [pending, setPending] = React.useState(false);

  if (methods.length === 0) {
    return (
      <div className="rounded-lg border border-negative/25 bg-negative/5 px-4 py-3 text-sm text-negative">
        Der er ingen betalingsmetoder tilgængelige lige nu. Kontakt os, så hjælper vi dig
        igennem.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="sr-only">Betalingsmetode</legend>
        <div className="space-y-2">
          {methods.map((method) => (
            <label
              key={method.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors",
                method.id === selectedId
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:bg-surface-muted"
              )}
            >
              <input
                type="radio"
                name="payment"
                value={method.id}
                checked={method.id === selectedId}
                onChange={() => setSelectedId(method.id)}
                className="mt-1 size-4 accent-[--color-accent]"
              />
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{method.label}</span>
                  {method.isDevelopmentStub ? <Badge tone="caution">Test</Badge> : null}
                </span>
                {method.description ? (
                  <span className="mt-0.5 block text-sm text-ink-soft">{method.description}</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button
        size="lg"
        full
        disabled={pending || !selectedId}
        onClick={async () => {
          const method = methods.find((entry) => entry.id === selectedId);
          if (!method) return;

          setPending(true);
          onError(null);
          const result = await initiatePayment(method.id);
          setPending(false);

          if (!result.ok) {
            onError(result.message ?? "Betalingen kunne ikke forberedes.");
            return;
          }
          onDone(method);
        }}
      >
        {pending ? "Forbereder …" : "Fortsæt til bekræftelse"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------- structure */

function StepNav({
  steps,
  current,
  done,
  onSelect,
}: {
  steps: readonly { id: Step; label: string }[];
  current: Step;
  done: ReadonlySet<Step>;
  onSelect: (step: Step) => void;
}): React.JSX.Element {
  return (
    <ol className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((entry, index) => {
        const isDone = done.has(entry.id);
        const isCurrent = entry.id === current;
        return (
          <li key={entry.id} className="flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden="true" className="h-px w-4 bg-line sm:w-8" />
            ) : null}
            <button
              type="button"
              // Only completed steps can be jumped back to; jumping forward
              // would skip validation the next step depends on.
              disabled={!isDone && !isCurrent}
              onClick={() => onSelect(entry.id)}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                isCurrent ? "font-medium text-ink" : "text-ink-faint",
                isDone && !isCurrent && "text-ink-soft hover:bg-surface-muted",
                !isDone && !isCurrent && "cursor-not-allowed"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[0.6875rem] font-semibold",
                  isDone
                    ? "bg-positive text-white"
                    : isCurrent
                      ? "bg-accent text-white"
                      : "bg-surface-muted text-ink-faint"
                )}
              >
                {isDone ? <CheckIcon className="size-3" /> : index + 1}
              </span>
              {entry.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepPanel({
  id,
  title,
  step,
  done,
  summary,
  onOpen,
  children,
}: {
  id: Step;
  title: string;
  step: Step;
  done: ReadonlySet<Step>;
  summary: string | null;
  onOpen: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const open = step === id;
  const completed = done.has(id);

  return (
    <section
      className={cn(
        "rounded-xl border bg-surface transition-colors",
        open ? "border-line-strong" : "border-line"
      )}
    >
      <h2>
        <button
          type="button"
          onClick={onOpen}
          disabled={!completed && !open}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 p-4 text-left disabled:cursor-default sm:p-5"
        >
          <span className="font-semibold text-ink">{title}</span>
          {!open && summary ? (
            <span className="truncate text-sm text-ink-soft">{summary}</span>
          ) : null}
          {!open && completed ? (
            <span className="shrink-0 text-sm font-medium text-accent">Ret</span>
          ) : null}
        </button>
      </h2>

      {open ? <div className="border-t border-line p-4 sm:p-5">{children}</div> : null}
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  error,
  hint,
  ...props
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  const id = `felt-${name}`;
  const describedBy = [error ? `${id}-fejl` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "mt-1.5 h-11 w-full rounded-lg border bg-surface px-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30",
          error ? "border-negative" : "border-line focus:border-accent"
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-fejl`} className="mt-1 text-xs text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={cn("text-right", strong && "text-base font-semibold tabular-nums")}>
        {value}
      </dd>
    </div>
  );
}
