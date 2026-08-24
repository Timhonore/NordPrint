import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_STATUS_LABELS, deriveOrderStatus } from "@nordprint/types";
import { formatMoney, money } from "@nordprint/commerce";
import { Badge, TechLabel, buttonVariants } from "@nordprint/ui";
import { apiFetch } from "@/lib/api/client";
import { CheckIcon, TruckIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Ordrebekræftelse",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface MedusaOrder {
  id: string;
  display_id: number;
  email: string;
  created_at: string;
  currency_code: string;
  status: string;
  payment_status?: string;
  fulfillment_status?: string;
  items: {
    id: string;
    title: string;
    variant_title: string | null;
    quantity: number;
    total: number;
  }[];
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  shipping_address?: {
    first_name: string;
    last_name: string;
    address_1: string;
    postal_code: string;
    city: string;
  } | null;
  shipping_methods?: { name: string }[];
}

/**
 * Order confirmation.
 *
 * The single most important page after a purchase: it has to answer "did that
 * work?" without ambiguity, and it has to keep working when the customer
 * bookmarks it and comes back a week later.
 */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;

  const result = await apiFetch<{ order: MedusaOrder }>(`/store/orders/${encodeURIComponent(id)}`, {
    revalidate: 0,
  });

  if (!result.ok) notFound();

  const order = result.data.order;
  const currency = order.currency_code.toUpperCase();
  const toMoney = (amount: number): ReturnType<typeof money> =>
    money(Math.round((amount ?? 0) * 100), currency);

  const status = deriveOrderStatus(
    (order.payment_status ?? "not_paid") as never,
    (order.fulfillment_status ?? "not_fulfilled") as never,
    order.status === "canceled"
  );

  return (
    <div className="container-page max-w-3xl py-10 md:py-16">
      <div className="mb-8 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-positive/10 text-positive">
          <CheckIcon className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tak for din ordre</h1>
          <p className="mt-1 text-ink-soft">
            Vi har sendt en bekræftelse til <strong className="text-ink">{order.email}</strong>.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <TechLabel>Ordrenummer</TechLabel>
            <p className="mt-0.5 font-mono text-lg font-semibold">#{order.display_id}</p>
          </div>
          <Badge tone={status === "canceled" ? "negative" : "positive"}>
            {ORDER_STATUS_LABELS[status]}
          </Badge>
        </div>

        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-medium text-ink">{item.title}</p>
                {item.variant_title ? (
                  <p className="mt-0.5 text-sm text-ink-soft">{item.variant_title}</p>
                ) : null}
                <p className="mt-0.5 text-sm text-ink-faint">{item.quantity} stk.</p>
              </div>
              <p className="shrink-0 font-medium tabular-nums">
                {formatMoney(toMoney(item.total))}
              </p>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-line p-5 text-sm">
          <Row label="Subtotal" value={formatMoney(toMoney(order.subtotal))} />
          {order.discount_total > 0 ? (
            <Row label="Rabat" value={`− ${formatMoney(toMoney(order.discount_total))}`} positive />
          ) : null}
          <Row label="Fragt" value={formatMoney(toMoney(order.shipping_total))} />
          <div className="flex justify-between border-t border-line pt-2.5 text-lg font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(toMoney(order.total))}</dd>
          </div>
          <Row label="Heraf moms" value={formatMoney(toMoney(order.tax_total))} faint />
        </dl>
      </div>

      {order.shipping_address ? (
        <div className="mt-5 rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <TruckIcon className="size-4 text-ink-faint" />
            <TechLabel>Leveres til</TechLabel>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {order.shipping_address.first_name} {order.shipping_address.last_name}
            <br />
            {order.shipping_address.address_1}
            <br />
            {order.shipping_address.postal_code} {order.shipping_address.city}
          </p>
          {order.shipping_methods?.[0] ? (
            <p className="mt-2 text-sm font-medium text-ink">{order.shipping_methods[0].name}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/produkter" className={buttonVariants({})}>
          Handl videre
        </Link>
        <Link href="/konto/ordrer" className={buttonVariants({ variant: "secondary" })}>
          Se mine ordrer
        </Link>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        Spørgsmål til ordren? Skriv til os og oplys ordrenummer #{order.display_id}.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  positive = false,
  faint = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  faint?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={`flex justify-between ${positive ? "text-positive" : ""} ${faint ? "text-xs text-ink-faint" : ""}`}
    >
      <dt className={positive || faint ? "" : "text-ink-soft"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
