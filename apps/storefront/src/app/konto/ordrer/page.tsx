import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, TechLabel, buttonVariants } from "@nordprint/ui";
import { CartIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Ordrer" };

/**
 * Order history.
 *
 * Requires a customer session. Until the account authentication flow is wired
 * up this states plainly what is needed rather than showing an empty list that
 * looks like "you have never ordered anything".
 */
export default function OrdersPage(): React.JSX.Element {
  return (
    <div>
      <TechLabel>Historik</TechLabel>
      <h2 className="mb-6 mt-1.5 text-xl font-bold tracking-tight">Ordrer</h2>

      <EmptyState
        icon={<CartIcon className="size-8" />}
        title="Log ind for at se dine ordrer"
        description="Har du handlet som gæst, kan du finde ordren via linket i din ordrebekræftelse."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/konto/log-ind" className={buttonVariants({})}>
              Log ind
            </Link>
            <Link href="/produkter" className={buttonVariants({ variant: "secondary" })}>
              Handl videre
            </Link>
          </div>
        }
      />
    </div>
  );
}
