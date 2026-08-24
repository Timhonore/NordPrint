import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ChartBar } from "@medusajs/icons";
import { Container, Heading, Text, Badge, Table } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { formatMoney, money } from "@nordprint/commerce";

/**
 * NordPrint dashboard.
 *
 * Every figure is a real aggregate from `/admin/nordprint/dashboard`. There is
 * no sample data and no placeholder chart: people make purchasing decisions
 * from this screen, and a number that might be invented is worse than no
 * number at all.
 */
interface Dashboard {
  currency: string;
  today: { revenue: number; orderCount: number; averageOrderValue: number };
  lowStockCount: number;
  topProducts: { productId: string; title: string; units: number; revenue: number }[];
  lowStock: {
    variantId: string;
    sku: string | null;
    productTitle: string;
    variantTitle: string;
    available: number;
  }[];
  recentOrders: {
    id: string;
    displayId: number;
    email: string;
    status: string;
    total: number;
    createdAt: string;
  }[];
  needsAction: { staleOrders: number; pendingReviews: number };
}

/**
 * Money is formatted in exactly one place in this codebase. The admin is no
 * exception: a dashboard that rounds differently from the storefront is a
 * dashboard nobody trusts.
 */
const formatDkk = (minor: number): string => formatMoney(money(minor, "DKK"));

const NordPrintDashboard = () => {
  const [data, setData] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/admin/nordprint/dashboard", { credentials: "include" });
        if (!response.ok) throw new Error("failed");
        const body = (await response.json()) as Dashboard;
        if (!cancelled) {
          setData(body);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <Container>
        <Text>Henter tal …</Text>
      </Container>
    );
  }

  if (status === "error" || !data) {
    return (
      <Container>
        <Text className="text-ui-fg-error">Dashboardet kunne ikke hentes.</Text>
      </Container>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Container className="p-0">
        <div className="border-ui-border-base border-b px-6 py-4">
          <Heading level="h1">NordPrint</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Tal for i dag, opdateret ved hver indlæsning
          </Text>
        </div>

        <div className="grid grid-cols-2 gap-px bg-ui-border-base lg:grid-cols-4">
          <Stat label="Omsætning i dag" value={formatDkk(data.today.revenue)} />
          <Stat label="Ordrer" value={String(data.today.orderCount)} />
          <Stat label="Gennemsnitlig ordre" value={formatDkk(data.today.averageOrderValue)} />
          <Stat
            label="Produkter med lavt lager"
            value={String(data.lowStockCount)}
            tone={data.lowStockCount > 0 ? "orange" : undefined}
          />
        </div>
      </Container>

      {data.needsAction.staleOrders > 0 || data.needsAction.pendingReviews > 0 ? (
        <Container>
          <Heading level="h2" className="mb-3">
            Kræver handling
          </Heading>
          <div className="flex flex-wrap gap-3">
            {data.needsAction.staleOrders > 0 ? (
              <Badge color="orange">
                {data.needsAction.staleOrders} ordrer har ligget over et døgn
              </Badge>
            ) : null}
            {data.needsAction.pendingReviews > 0 ? (
              <Badge color="blue">
                {data.needsAction.pendingReviews} anmeldelser afventer moderation
              </Badge>
            ) : null}
          </div>
        </Container>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Container className="p-0">
          <div className="border-ui-border-base border-b px-6 py-4">
            <Heading level="h2">Topprodukter (30 dage)</Heading>
          </div>
          {data.topProducts.length === 0 ? (
            <div className="px-6 py-4">
              <Text size="small" className="text-ui-fg-subtle">
                Ingen salg registreret endnu.
              </Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Produkt</Table.HeaderCell>
                  <Table.HeaderCell>Stk.</Table.HeaderCell>
                  <Table.HeaderCell>Omsætning</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.topProducts.map((product) => (
                  <Table.Row key={product.productId}>
                    <Table.Cell>{product.title}</Table.Cell>
                    <Table.Cell>{product.units}</Table.Cell>
                    <Table.Cell>{formatDkk(product.revenue)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Container>

        <Container className="p-0">
          <div className="border-ui-border-base border-b px-6 py-4">
            <Heading level="h2">Lavt lager</Heading>
          </div>
          {data.lowStock.length === 0 ? (
            <div className="px-6 py-4">
              <Text size="small" className="text-ui-fg-subtle">
                Alt er på lager.
              </Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Vare</Table.HeaderCell>
                  <Table.HeaderCell>SKU</Table.HeaderCell>
                  <Table.HeaderCell>Antal</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.lowStock.slice(0, 10).map((entry) => (
                  <Table.Row key={entry.variantId}>
                    <Table.Cell>
                      {entry.productTitle}
                      <span className="text-ui-fg-subtle"> · {entry.variantTitle}</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap font-mono text-xs">
                      {entry.sku ?? "—"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge size="2xsmall" color={entry.available === 0 ? "red" : "orange"}>
                        {entry.available}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Container>
      </div>

      <Container className="p-0">
        <div className="border-ui-border-base border-b px-6 py-4">
          <Heading level="h2">Seneste ordrer</Heading>
        </div>
        {data.recentOrders.length === 0 ? (
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-subtle">
              Ingen ordrer endnu.
            </Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Ordre</Table.HeaderCell>
                <Table.HeaderCell>Kunde</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Total</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.recentOrders.map((order) => (
                <Table.Row key={order.id}>
                  <Table.Cell>#{order.displayId}</Table.Cell>
                  <Table.Cell>{order.email}</Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall">{order.status}</Badge>
                  </Table.Cell>
                  <Table.Cell>{formatDkk(order.total)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>
    </div>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "orange" }) => (
  <div className="bg-ui-bg-base px-6 py-5">
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text
      size="xlarge"
      weight="plus"
      className={tone === "orange" ? "text-ui-tag-orange-text mt-1" : "mt-1"}
    >
      {value}
    </Text>
  </div>
);

export const config = defineRouteConfig({
  label: "NordPrint",
  icon: ChartBar,
});

export default NordPrintDashboard;
