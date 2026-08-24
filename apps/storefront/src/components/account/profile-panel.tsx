"use client";

import * as React from "react";
import { Button, Card, CardBody, TextField } from "@nordprint/ui";
import type { Customer } from "@/lib/account/session";
import {
  logout,
  requestAccountDeletion,
  requestDataExport,
  updateProfile,
} from "@/lib/account/actions";
import { ReopenConsentButton } from "@/components/consent/cookie-consent";

/**
 * Profile, plus the two things GDPR entitles the customer to do themselves.
 *
 * The export is produced by the server and handed over as a download the
 * browser builds from the response — the data never touches a third party,
 * and nothing is written to disk on our side.
 */
export function ProfilePanel({ customer }: { readonly customer: Customer }): React.JSX.Element {
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<null | "save" | "export" | "delete">(null);

  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setPending("save");

    const data = new FormData(event.currentTarget);
    const result = await updateProfile({
      firstName: String(data.get("firstName") ?? ""),
      lastName: String(data.get("lastName") ?? ""),
      phone: String(data.get("phone") ?? ""),
    });

    setPending(null);
    if (result.ok) setStatus("Dine oplysninger er gemt.");
    else setError(result.message ?? "Oplysningerne kunne ikke gemmes.");
  };

  const download = async (): Promise<void> => {
    setStatus(null);
    setError(null);
    setPending("export");

    const result = await requestDataExport();
    setPending(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nordprint-mine-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setStatus("Dine data er hentet som en JSON-fil.");
  };

  const requestDeletion = async (): Promise<void> => {
    // A deletion request is not undoable from here, so it asks first.
    const confirmed = window.confirm(
      "Vi registrerer din anmodning og vender tilbage inden for en måned. Fakturaer beholder vi i fem år, som bogføringsloven kræver — de bliver anonymiseret. Vil du fortsætte?"
    );
    if (!confirmed) return;

    setStatus(null);
    setError(null);
    setPending("delete");

    const result = await requestAccountDeletion();
    setPending(null);

    if (result.ok) {
      setStatus("Din anmodning er registreret. Vi vender tilbage inden for en måned.");
    } else {
      setError(result.message ?? "Anmodningen kunne ikke registreres.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <form onSubmit={(event) => void save(event)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="firstName"
                label="Fornavn"
                defaultValue={customer.firstName ?? ""}
                autoComplete="given-name"
              />
              <TextField
                name="lastName"
                label="Efternavn"
                defaultValue={customer.lastName ?? ""}
                autoComplete="family-name"
              />
            </div>

            <TextField
              name="phone"
              label="Telefon"
              type="tel"
              defaultValue={customer.phone ?? ""}
              autoComplete="tel"
              hint="Bruges kun, hvis der er noget med din pakke."
            />

            <div>
              <p className="text-sm font-medium text-ink">E-mail</p>
              <p className="mt-1 text-sm text-ink-soft">{customer.email}</p>
              <p className="mt-1 text-xs text-ink-faint">
                Skriv til os, hvis din e-mail skal ændres — den er knyttet til dine ordrer.
              </p>
            </div>

            <Button type="submit" disabled={pending === "save"}>
              {pending === "save" ? "Gemmer …" : "Gem ændringer"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <div aria-live="polite">
        {status ? (
          <p className="rounded-lg border border-positive/25 bg-positive/5 px-3 py-2.5 text-sm text-positive">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-negative/25 bg-negative/5 px-3 py-2.5 text-sm text-negative">
            {error}
          </p>
        ) : null}
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-ink">Download mine data</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              En maskinlæsbar kopi af alt, vi har registreret om dig.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending === "export"}
            onClick={() => void download()}
          >
            {pending === "export" ? "Henter …" : "Hent kopi"}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-ink">Slet min konto</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              Vi sletter dine oplysninger. Bogføringsloven kræver, at vi gemmer fakturaer i fem år —
              de bliver anonymiseret i stedet.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending === "delete"}
            onClick={() => void requestDeletion()}
          >
            {pending === "delete" ? "Sender …" : "Anmod om sletning"}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-ink">Cookieindstillinger</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              Skift dit samtykke til statistik og markedsføring.
            </p>
          </div>
          <ReopenConsentButton />
        </CardBody>
      </Card>

      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm">
          Log ud
        </Button>
      </form>
    </div>
  );
}
