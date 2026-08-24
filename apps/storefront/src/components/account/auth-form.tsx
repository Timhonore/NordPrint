"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, TextField } from "@nordprint/ui";
import { login, register } from "@/lib/account/actions";
import { validatePassword } from "@/lib/account/validation";
import { readGuestStateForMerge } from "@/lib/preferences/preferences-provider";

type Mode = "login" | "register";

/**
 * Login and sign-up in one form.
 *
 * They are the same fields plus two, and splitting them across two pages
 * mostly serves to make people who picked wrong start over. The mode is in
 * the URL so an "opret konto"-link can point straight at the right one.
 *
 * Guest printers and favourites are read from local storage and handed to the
 * server action, so they follow the customer into the account instead of
 * quietly disappearing the first time they sign in.
 */
export function AuthForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = React.useState<Mode>(
    searchParams.get("opret") !== null ? "register" : "login"
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const returnTo = sanitizeReturn(searchParams.get("retur"));

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    if (mode === "register") {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setPending(true);

    const guest = readGuestStateForMerge();

    const result =
      mode === "login"
        ? await login({ email, password, guest })
        : await register({
            email,
            password,
            firstName: String(data.get("firstName") ?? ""),
            lastName: String(data.get("lastName") ?? ""),
            guest,
          });

    setPending(false);

    if (!result.ok) {
      setError(result.message ?? "Noget gik galt. Prøv igen.");
      return;
    }

    router.replace(returnTo);
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 flex rounded-lg border border-line p-1">
        <ModeTab current={mode} value="login" onSelect={setMode}>
          Log ind
        </ModeTab>
        <ModeTab current={mode} value="register" onSelect={setMode}>
          Opret konto
        </ModeTab>
      </div>

      <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        {mode === "register" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="firstName" label="Fornavn" autoComplete="given-name" required />
            <TextField name="lastName" label="Efternavn" autoComplete="family-name" />
          </div>
        ) : null}

        <TextField
          name="email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
        />

        <TextField
          name="password"
          label="Adgangskode"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          {...(mode === "register" ? { hint: "Mindst 8 tegn." } : {})}
        />

        {/* Fejlen annonceres, ikke bare vist. */}
        <div aria-live="polite">
          {error ? (
            <p className="rounded-lg border border-negative/25 bg-negative/5 px-3 py-2.5 text-sm text-negative">
              {error}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" full disabled={pending}>
          {pending
            ? mode === "login"
              ? "Logger ind …"
              : "Opretter …"
            : mode === "login"
              ? "Log ind"
              : "Opret konto"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Du behøver ikke en konto for at handle — gæstekøb virker fint.
      </p>
    </div>
  );
}

function ModeTab({
  current,
  value,
  onSelect,
  children,
}: {
  readonly current: Mode;
  readonly value: Mode;
  readonly onSelect: (mode: Mode) => void;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const active = current === value;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(value)}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-surface-inverse text-ink-inverse" : "text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Only same-site paths. An open redirect on a login page is how a phishing
 * link gets to wear our domain.
 */
function sanitizeReturn(value: string | null): string {
  if (!value) return "/konto";
  if (!value.startsWith("/") || value.startsWith("//")) return "/konto";
  return value;
}
