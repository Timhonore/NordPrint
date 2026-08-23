import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, TechLabel, buttonVariants } from "@nordprint/ui";
import { TruckIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Adresser" };

export default function AddressesPage(): React.JSX.Element {
  return (
    <div>
      <TechLabel>Levering</TechLabel>
      <h2 className="mb-6 mt-1.5 text-xl font-bold tracking-tight">Adresser</h2>

      <EmptyState
        icon={<TruckIcon className="size-8" />}
        title="Log ind for at gemme adresser"
        description="Gemte adresser gør checkout til to klik næste gang."
        action={
          <Link href="/konto/log-ind" className={buttonVariants({})}>
            Log ind
          </Link>
        }
      />
    </div>
  );
}
