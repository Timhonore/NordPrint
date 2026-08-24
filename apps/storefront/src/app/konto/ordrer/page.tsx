import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, EmptyState, TechLabel, buttonVariants } from "@nordprint/ui";
import { formatMoney, money } from "@nordprint/commerce";
import { CartIcon } from "@/components/icons";
import { SignInRequired } from "@/components/account/sign-in-required";
import { fetchCustomerOrders } from "@/lib/account/orders";
import { getCustomer } from "@/lib/account/session";

export const metadata: Metadata = { title: "Ordrer" };

export default async function OrdersPage(): Promise<React.JSX.Element> {
  const customer = await getCustomer();

  return (
    <div>
      <TechLabel>Historik</TechLabel>
      <h2 className="mb-6 mt-1.5 text-xl font-bold tracking-tight">Ordrer</h2>

      {!customer ? (
        <SignInRequired
          icon={<CartIcon className="size-8" />}
          title="Log ind for at se dine ordrer"
          description="Har du handlet som gæst, kan du finde ordren via linket i din ordrebekræftelse."
          returnTo="/konto/ordrer"
        />
      ) : (
        <OrderList />
      )}
    </div>
  );
}

async function OrderList(): Promise<React.JSX.Element> {
  const result = await fetchCustomerOrders();

  if (!result.ok) {
    return (
      <EmptyState
        title="Ordrerne kunne ikke hentes"
        description="Der var et problem med forbindelsen. Prøv at genindlæse siden."
      />
    );
  }

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<CartIcon className="size-8" />}
        title="Ingen ordrer endnu"
        description="Når du har handlet, kan du følge pakken herfra."
        action={
          <Link href="/filament" className={buttonVariants({})}>
            Shop filament
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {result.data.map((order) => (
        <li key={order.id}>
          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link href={`/ordre/${order.id}`} className="font-medium text-ink hover:underline">
                  Ordre #{order.displayId}
                </Link>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {formatDate(order.createdAt)} · {order.itemCount}{" "}
                  {order.itemCount === 1 ? "vare" : "varer"}
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold tabular-nums">
                  {formatMoney(money(order.total, order.currencyCode))}
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">{order.statusLabel}</p>
              </div>
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso)
  );
