import Link from "next/link";
import { EmptyState, buttonVariants } from "@nordprint/ui";
import { AlertIcon } from "@/components/icons";

/**
 * Catalogue error state.
 *
 * Shown when the commerce backend cannot be reached. The customer gets a real
 * explanation and a way forward rather than a blank page or a stack trace —
 * and the page still renders with the header, so they are not stranded.
 */
export function CatalogError(): React.JSX.Element {
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={<AlertIcon className="size-8" />}
        title="Vi kunne ikke hente produkterne"
        description="Der er et midlertidigt problem med forbindelsen til vores lager. Prøv igen om et øjeblik — din kurv er ikke gået tabt."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/" className={buttonVariants({ variant: "secondary" })}>
              Til forsiden
            </Link>
            <Link href="/kontakt" className={buttonVariants({ variant: "ghost" })}>
              Kontakt os
            </Link>
          </div>
        }
      />
    </div>
  );
}
