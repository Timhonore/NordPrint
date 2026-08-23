import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, TechLabel, buttonVariants } from "@nordprint/ui";

export const metadata: Metadata = { title: "Profil" };

/**
 * Profile and privacy.
 *
 * The GDPR controls live here rather than buried in a policy page: a right the
 * customer cannot find is a right they do not have.
 */
export default function ProfilePage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <TechLabel>Dine oplysninger</TechLabel>
        <h2 className="mb-6 mt-1.5 text-xl font-bold tracking-tight">Profil</h2>

        <Card>
          <CardBody>
            <p className="text-sm text-ink-soft">
              Log ind for at rette navn, e-mail og adgangskode.
            </p>
            <Link href="/konto/log-ind" className={`${buttonVariants({})} mt-4`}>
              Log ind
            </Link>
          </CardBody>
        </Card>
      </div>

      <div>
        <TechLabel>Privatliv</TechLabel>
        <h3 className="mb-3 mt-1.5 text-lg font-semibold">Dine data</h3>

        <div className="space-y-3">
          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">Download mine data</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  Vi sender en maskinlæsbar kopi af alt, vi har registreret om dig.
                </p>
              </div>
              <Link
                href="/konto/log-ind?retur=/konto/profil"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Anmod om kopi
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">Slet min konto</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  Vi sletter dine oplysninger. Bogføringsloven kræver, at vi gemmer
                  fakturaer i fem år — de bliver anonymiseret i stedet.
                </p>
              </div>
              <Link
                href="/konto/log-ind?retur=/konto/profil"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Anmod om sletning
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">Cookieindstillinger</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  Skift dit samtykke til statistik og markedsføring.
                </p>
              </div>
              <Link
                href="/cookies"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Ret samtykke
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
