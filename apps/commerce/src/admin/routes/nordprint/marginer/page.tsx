import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CurrencyDollar } from "@medusajs/icons";
import { Badge, Button, Container, Heading, Input, Table, Text } from "@medusajs/ui";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../../../lib/admin-fetch";

/**
 * Cost price and margin.
 *
 * This screen exists because the storefront must never see a cost price — so
 * there has to be exactly one place that does. Salgspris, indkøbspris,
 * dækningsbidrag and margin all arrive pre-formatted from the backend, which
 * computes them with the same functions the storefront uses for prices. A
 * margin the admin rounds differently from the invoice is a margin nobody
 * acts on.
 *
 * Variants without a cost price are called out rather than shown as 0 %: an
 * unknown margin and a zero margin are very different problems.
 */

interface MarginRow {
  variantId: string;
  sku: string | null;
  productTitle: string;
  variantTitle: string;
  salePrice: number | null;
  costPrice: number | null;
  marginPercent: number | null;
  formatted: {
    salePrice: string;
    costPrice: string;
    contribution: string;
    margin: string;
  } | null;
}

interface MarginResponse {
  items: MarginRow[];
  count: number;
  limit: number;
  offset: number;
  currency: string;
  missingCostPrice: number;
}

const PAGE_SIZE = 50;

/** Below this, a sale is barely worth picking and packing. */
const LOW_MARGIN = 15;

const MarginOverview = () => {
  const [data, setData] = useState<MarginResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (search: string, from: number) => {
    setStatus("loading");

    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(from) });
    if (search.trim()) params.set("q", search.trim());

    const result = await adminFetch<MarginResponse>(`/admin/nordprint/margins?${params}`);

    if (!result.ok) {
      setError(result.message);
      setStatus("error");
      return;
    }

    setError(null);
    setData(result.data);
    setStatus("ready");
  }, []);

  useEffect(() => {
    // Debounced: typing a SKU should not fire a query per keystroke.
    const timer = setTimeout(() => void load(query, offset), 250);
    return () => clearTimeout(timer);
  }, [load, query, offset]);

  const saveCostPrice = async (row: MarginRow): Promise<void> => {
    const raw = (drafts[row.variantId] ?? "").replace(",", ".").trim();
    const major = Number(raw);

    if (raw === "" || !Number.isFinite(major) || major < 0) {
      setError(`Ugyldig indkøbspris for ${row.sku ?? row.variantTitle}.`);
      return;
    }

    setBusy(row.variantId);
    setError(null);

    const result = await adminFetch("/admin/nordprint/margins", {
      method: "POST",
      // The API takes minor units, like everything else in this codebase.
      body: { variantId: row.variantId, costPrice: Math.round(major * 100) },
    });

    setBusy(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDrafts((current) => {
      const next = { ...current };
      delete next[row.variantId];
      return next;
    });
    await load(query, offset);
  };

  const page = data ? Math.floor(data.offset / PAGE_SIZE) + 1 : 1;
  const pages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h1">Marginer</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Indkøbspris og dækningsbidrag. Vises aldrig i butikken.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          {data && data.missingCostPrice > 0 ? (
            <Badge color="orange">{data.missingCostPrice} uden indkøbspris</Badge>
          ) : null}
          <Input
            placeholder="Søg på SKU eller produkt"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOffset(0);
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="px-6 py-3">
          <Text className="text-ui-fg-error">{error}</Text>
        </div>
      ) : null}

      <div className="px-6 py-4">
        {status === "loading" && !data ? (
          <Text className="text-ui-fg-subtle">Henter …</Text>
        ) : status === "error" ? (
          <Button variant="secondary" onClick={() => void load(query, offset)}>
            Prøv igen
          </Button>
        ) : !data || data.items.length === 0 ? (
          <Text className="text-ui-fg-subtle">Ingen varianter matcher søgningen.</Text>
        ) : (
          <>
            {/*
              Egen scroll-container: seks kolonner passer ikke på en telefon,
              og uden den her scroller HELE admin-siden sideværts — sidebjælke
              og topbar glider med ud af skærmen. Det negative margin lader
              tabellen gå helt ud til kanten, så man kan se, der er mere.
            */}
            <div className="-mx-6 overflow-x-auto px-6">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Vare</Table.HeaderCell>
                    <Table.HeaderCell>SKU</Table.HeaderCell>
                    <Table.HeaderCell>Salgspris</Table.HeaderCell>
                    <Table.HeaderCell>Indkøbspris</Table.HeaderCell>
                    <Table.HeaderCell>Dækningsbidrag</Table.HeaderCell>
                    <Table.HeaderCell>Margin</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {data.items.map((row) => (
                    <Table.Row key={row.variantId}>
                      <Table.Cell>
                        {row.productTitle}
                        <span className="text-ui-fg-subtle"> · {row.variantTitle}</span>
                      </Table.Cell>

                      <Table.Cell className="whitespace-nowrap font-mono text-xs">
                        {row.sku ?? "—"}
                      </Table.Cell>

                      <Table.Cell className="tabular-nums">
                        {row.formatted?.salePrice ?? "—"}
                      </Table.Cell>

                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-28"
                            inputMode="decimal"
                            placeholder={row.costPrice === null ? "Ikke sat" : ""}
                            value={
                              drafts[row.variantId] ??
                              (row.costPrice === null ? "" : String(row.costPrice / 100))
                            }
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [row.variantId]: event.target.value,
                              }))
                            }
                          />
                          {drafts[row.variantId] !== undefined ? (
                            <Button
                              size="small"
                              disabled={busy === row.variantId}
                              onClick={() => void saveCostPrice(row)}
                            >
                              Gem
                            </Button>
                          ) : null}
                        </div>
                      </Table.Cell>

                      <Table.Cell className="tabular-nums">
                        {row.formatted?.contribution ?? "—"}
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
                                : row.marginPercent < LOW_MARGIN
                                  ? "orange"
                                  : "green"
                            }
                          >
                            {row.formatted?.margin}
                          </Badge>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>

            {pages > 1 ? (
              <div className="mt-4 flex items-center justify-between">
                <Text size="small" className="text-ui-fg-subtle">
                  Side {page} af {pages} · {data.count} varianter
                </Text>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={data.offset === 0}
                    onClick={() => setOffset(Math.max(0, data.offset - PAGE_SIZE))}
                  >
                    Forrige
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={data.offset + PAGE_SIZE >= data.count}
                    onClick={() => setOffset(data.offset + PAGE_SIZE)}
                  >
                    Næste
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Marginer",
  icon: CurrencyDollar,
});

export default MarginOverview;
