import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ArrowUpTray } from "@medusajs/icons";
import { Badge, Button, Container, Heading, Table, Text, Textarea } from "@medusajs/ui";
import { useRef, useState } from "react";
import { formatMoney, money } from "@nordprint/commerce";
import { adminFetch } from "../../../lib/admin-fetch";

/**
 * Inventory CSV import.
 *
 * Two steps, always: the file is validated and shown as a preview before a
 * single row is written. Nothing here writes on upload, and there is no path
 * where some rows land and the rest fail quietly — an import with errors is
 * refused outright unless the operator sees the errors and explicitly says
 * "importér resten alligevel".
 *
 * All the parsing and validation lives in the backend
 * (`lib/import/inventory-csv.ts`, 20 tests). This screen only shows what it
 * decided.
 */

interface RowError {
  line: number;
  sku: string | null;
  message: string;
}

interface RowChange {
  line: number;
  sku: string;
  variantId: string;
  productTitle: string;
  changes: { field: string; from: string | number | null; to: string | number | null }[];
  marginPercent: number | null;
}

interface Preview {
  committed: boolean;
  found: number;
  toUpdate: number;
  unchanged: number;
  errors: RowError[];
  changes: RowChange[];
  message?: string;
  applied?: number;
  failed?: { sku: string; message: string }[];
}

const FIELD_LABEL: Record<string, string> = {
  stock: "Lager",
  cost_price: "Indkøbspris",
  sale_price: "Salgspris",
  ean: "EAN",
};

const EXAMPLE =
  "sku,ean,stock,cost_price,sale_price\nNOR-PLA-BAS-JET-BL-1000,2912345000,42,102,189";

/**
 * Prices in the file are kroner, the way a buyer types them in Excel — the
 * parser accepts "102", "102,50" and "1.250,00". Internally everything is
 * øre, so the preview formats the values back before showing them: a diff
 * reading "12000 → 940000" is unreadable and invites a 100× mistake.
 */
const PRICE_FIELDS = new Set(["cost_price", "sale_price"]);

const formatCell = (field: string, value: string | number | null): string => {
  if (value === null || value === "") return "—";
  if (!PRICE_FIELDS.has(field)) return String(value);
  const amount = Number(value);
  return Number.isFinite(amount) ? formatMoney(money(amount, "DKK")) : String(value);
};

const InventoryImport = () => {
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<false | "preview" | "commit">(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const send = async (commit: boolean, force = false): Promise<void> => {
    if (csv.trim().length === 0) {
      setError("Indsæt CSV-data eller vælg en fil.");
      return;
    }

    setBusy(commit ? "commit" : "preview");
    setError(null);

    const result = await adminFetch<Preview>("/admin/nordprint/imports/inventory", {
      method: "POST",
      body: { csv, commit, force },
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setPreview(result.data);
  };

  const readFile = async (file: File): Promise<void> => {
    setCsv(await file.text());
    setPreview(null);
    setError(null);
  };

  const hasErrors = (preview?.errors.length ?? 0) > 0;

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Lagerimport</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Kolonner: sku, ean, stock, cost_price, sale_price. Priser i kroner — 102 eller 102,50.
          Filen kontrolleres altid, før noget skrives.
        </Text>
      </div>

      <div className="space-y-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
          <Button variant="secondary" size="small" onClick={() => fileRef.current?.click()}>
            Vælg CSV-fil
          </Button>
          <Text size="xsmall" className="text-ui-fg-muted">
            eller indsæt indholdet nedenfor
          </Text>
        </div>

        <Textarea
          rows={8}
          className="whitespace-nowrap font-mono text-xs"
          placeholder={EXAMPLE}
          value={csv}
          onChange={(event) => {
            setCsv(event.target.value);
            setPreview(null);
          }}
        />

        <div className="flex gap-2">
          <Button disabled={busy !== false} onClick={() => void send(false)}>
            {busy === "preview" ? "Kontrollerer …" : "Kontrollér filen"}
          </Button>
          {csv ? (
            <Button
              variant="secondary"
              disabled={busy !== false}
              onClick={() => {
                setCsv("");
                setPreview(null);
                setError(null);
              }}
            >
              Ryd
            </Button>
          ) : null}
        </div>

        {error ? <Text className="text-ui-fg-error">{error}</Text> : null}
      </div>

      {preview ? (
        <div className="space-y-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{preview.found} varer fundet</Badge>
            <Badge color={preview.toUpdate > 0 ? "blue" : "grey"}>
              {preview.toUpdate} opdateres
            </Badge>
            <Badge color="grey">{preview.unchanged} uændrede</Badge>
            <Badge color={hasErrors ? "red" : "green"}>{preview.errors.length} fejl</Badge>
            {preview.committed ? <Badge color="green">{preview.applied} skrevet</Badge> : null}
          </div>

          {preview.message ? (
            <Text size="small" className="text-ui-fg-subtle">
              {preview.message}
            </Text>
          ) : null}

          {hasErrors ? (
            <div>
              <Heading level="h3">Fejl</Heading>
              <Text size="small" className="mb-2 text-ui-fg-subtle">
                Rækker med fejl importeres ikke.
              </Text>
              <div className="-mx-6 overflow-x-auto px-6">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Linje</Table.HeaderCell>
                      <Table.HeaderCell>SKU</Table.HeaderCell>
                      <Table.HeaderCell>Problem</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {preview.errors.map((row) => (
                      <Table.Row key={`${row.line}-${row.sku ?? ""}`}>
                        <Table.Cell>{row.line}</Table.Cell>
                        <Table.Cell className="whitespace-nowrap font-mono text-xs">
                          {row.sku ?? "—"}
                        </Table.Cell>
                        <Table.Cell className="text-ui-fg-error">{row.message}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          ) : null}

          {preview.failed && preview.failed.length > 0 ? (
            <div>
              <Heading level="h3">Rækker der fejlede under skrivning</Heading>
              <div className="-mx-6 overflow-x-auto px-6">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>SKU</Table.HeaderCell>
                      <Table.HeaderCell>Problem</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {preview.failed.map((row) => (
                      <Table.Row key={row.sku}>
                        <Table.Cell className="whitespace-nowrap font-mono text-xs">
                          {row.sku}
                        </Table.Cell>
                        <Table.Cell className="text-ui-fg-error">{row.message}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          ) : null}

          {preview.changes.length > 0 ? (
            <div>
              <Heading level="h3">Ændringer</Heading>
              <div className="-mx-6 overflow-x-auto px-6">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Linje</Table.HeaderCell>
                      <Table.HeaderCell>Vare</Table.HeaderCell>
                      <Table.HeaderCell>Ændres</Table.HeaderCell>
                      <Table.HeaderCell>Margin efter</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {preview.changes.map((row) => (
                      <Table.Row key={row.variantId}>
                        <Table.Cell>{row.line}</Table.Cell>
                        <Table.Cell>
                          {row.productTitle}
                          <div className="whitespace-nowrap font-mono text-xs text-ui-fg-subtle">
                            {row.sku}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          {row.changes.map((change) => (
                            <div key={change.field} className="text-xs">
                              {FIELD_LABEL[change.field] ?? change.field}:{" "}
                              <span className="text-ui-fg-muted">
                                {formatCell(change.field, change.from)}
                              </span>{" "}
                              →{" "}
                              <span className="text-ui-fg-base">
                                {formatCell(change.field, change.to)}
                              </span>
                            </div>
                          ))}
                        </Table.Cell>
                        <Table.Cell>
                          {row.marginPercent === null ? (
                            <Text size="xsmall" className="text-ui-fg-muted">
                              Ukendt
                            </Text>
                          ) : (
                            <Badge
                              size="2xsmall"
                              color={
                                row.marginPercent < 0
                                  ? "red"
                                  : row.marginPercent < 15
                                    ? "orange"
                                    : "green"
                              }
                            >
                              {row.marginPercent} %
                            </Badge>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          ) : null}

          {!preview.committed && preview.toUpdate > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button disabled={busy !== false} onClick={() => void send(true)}>
                {busy === "commit" ? "Importerer …" : `Importér ${preview.toUpdate} ændringer`}
              </Button>

              {hasErrors ? (
                <Button
                  variant="secondary"
                  disabled={busy !== false}
                  onClick={() => void send(true, true)}
                >
                  Importér kun de gyldige rækker
                </Button>
              ) : null}
            </div>
          ) : null}

          {!preview.committed && preview.toUpdate === 0 && !hasErrors ? (
            <Text className="text-ui-fg-subtle">
              Der er ingen ændringer at importere — alt i filen matcher det, der allerede står i
              kataloget.
            </Text>
          ) : null}
        </div>
      ) : null}
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Lagerimport",
  icon: ArrowUpTray,
});

export default InventoryImport;
