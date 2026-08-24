import Link from "next/link";
import { Card, CardBody, TechLabel } from "@nordprint/ui";
import { CartIcon, HeartIcon, PrinterIcon, TruckIcon, UserIcon } from "@/components/icons";
import { SignInRequired } from "@/components/account/sign-in-required";
import { getCustomer } from "@/lib/account/session";

const SHORTCUTS = [
  {
    href: "/konto/ordrer",
    title: "Ordrer",
    description: "Følg dine pakker og se tidligere køb",
    Icon: CartIcon,
  },
  {
    href: "/konto/printere",
    title: "Mine printere",
    description: "Så viser vi kun det, der passer",
    Icon: PrinterIcon,
  },
  {
    href: "/konto/favoritter",
    title: "Favoritter",
    description: "Det, du har gemt til senere",
    Icon: HeartIcon,
  },
  {
    href: "/konto/adresser",
    title: "Adresser",
    description: "Leverings- og faktureringsadresser",
    Icon: TruckIcon,
  },
  {
    href: "/konto/profil",
    title: "Profil",
    description: "Navn, e-mail og adgangskode",
    Icon: UserIcon,
  },
] as const;

export default async function AccountPage(): Promise<React.JSX.Element> {
  const customer = await getCustomer();

  return (
    <div>
      <TechLabel>Oversigt</TechLabel>
      <p className="mb-6 mt-1.5 text-ink-soft">
        {customer
          ? `Hej ${customer.firstName ?? customer.email} — alt om dine køb, dine printere og dine oplysninger ét sted.`
          : "Alt om dine køb, dine printere og dine oplysninger ét sted."}
      </p>

      {!customer ? (
        <div className="mb-6">
          <SignInRequired
            icon={<UserIcon className="size-8" />}
            title="Log ind for at samle det hele"
            description="Ordrer, adresser og favoritter følger med kontoen. Du kan stadig handle som gæst."
            returnTo="/konto"
          />
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {SHORTCUTS.map(({ href, title, description, Icon }) => (
          <li key={href}>
            <Link href={href} className="block h-full">
              <Card className="h-full transition-colors hover:border-line-strong hover:bg-surface-muted">
                <CardBody className="flex items-start gap-3.5">
                  <Icon className="size-5 shrink-0 text-accent" />
                  <span>
                    <span className="block font-semibold text-ink">{title}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{description}</span>
                  </span>
                </CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
