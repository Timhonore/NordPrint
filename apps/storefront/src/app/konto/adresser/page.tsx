import type { Metadata } from "next";
import { Card, CardBody, EmptyState, TechLabel } from "@nordprint/ui";
import { TruckIcon } from "@/components/icons";
import { SignInRequired } from "@/components/account/sign-in-required";
import { fetchCustomerAddresses } from "@/lib/account/addresses";
import { getCustomer } from "@/lib/account/session";

export const metadata: Metadata = { title: "Adresser" };

export default async function AddressesPage(): Promise<React.JSX.Element> {
  const customer = await getCustomer();

  return (
    <div>
      <TechLabel>Levering</TechLabel>
      <h2 className="mb-6 mt-1.5 text-xl font-bold tracking-tight">Adresser</h2>

      {!customer ? (
        <SignInRequired
          icon={<TruckIcon className="size-8" />}
          title="Log ind for at gemme adresser"
          description="Gemte adresser gør checkout til to klik næste gang."
          returnTo="/konto/adresser"
        />
      ) : (
        <AddressList />
      )}
    </div>
  );
}

async function AddressList(): Promise<React.JSX.Element> {
  const result = await fetchCustomerAddresses();

  if (!result.ok) {
    return (
      <EmptyState
        title="Adresserne kunne ikke hentes"
        description="Der var et problem med forbindelsen. Prøv at genindlæse siden."
      />
    );
  }

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<TruckIcon className="size-8" />}
        title="Ingen gemte adresser"
        description="Den adresse, du bruger ved næste køb, bliver gemt her — så slipper du for at taste den igen."
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {result.data.map((address) => (
        <li key={address.id}>
          <Card className="h-full">
            <CardBody>
              <p className="font-medium text-ink">
                {[address.firstName, address.lastName].filter(Boolean).join(" ") || "Adresse"}
              </p>
              <address className="mt-1 text-sm not-italic leading-relaxed text-ink-soft">
                {address.company ? (
                  <>
                    {address.company}
                    <br />
                  </>
                ) : null}
                {address.address1}
                {address.address2 ? (
                  <>
                    <br />
                    {address.address2}
                  </>
                ) : null}
                <br />
                {address.postalCode} {address.city}
                <br />
                {address.countryCode?.toUpperCase()}
                {address.phone ? (
                  <>
                    <br />
                    {address.phone}
                  </>
                ) : null}
              </address>
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
