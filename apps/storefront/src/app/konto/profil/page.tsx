import type { Metadata } from "next";
import { TechLabel } from "@nordprint/ui";
import { UserIcon } from "@/components/icons";
import { ProfilePanel } from "@/components/account/profile-panel";
import { SignInRequired } from "@/components/account/sign-in-required";
import { getCustomer } from "@/lib/account/session";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const customer = await getCustomer();

  return (
    <div>
      <TechLabel>Oplysninger</TechLabel>
      <h2 className="mb-6 mt-1.5 text-xl font-bold tracking-tight">Profil</h2>

      {customer ? (
        <ProfilePanel customer={customer} />
      ) : (
        <SignInRequired
          icon={<UserIcon className="size-8" />}
          title="Log ind for at se din profil"
          description="Her kan du rette dine oplysninger, hente dine data og bede om at få kontoen slettet."
          returnTo="/konto/profil"
        />
      )}
    </div>
  );
}
