import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AccountNav } from "@/components/account/account-nav";

export const metadata: Metadata = {
  title: { default: "Min konto", template: "%s | Min konto" },
  robots: { index: false, follow: false },
};

/**
 * Account shell.
 *
 * The navigation is shared across every account page so the customer always
 * knows where they are and can move sideways without going back.
 */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <>
      <Breadcrumbs items={[{ label: "Min konto", href: "/konto" }]} />

      <div className="container-page py-8 md:py-12">
        <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">Min konto</h1>

        <div className="grid gap-8 lg:grid-cols-[14rem_1fr] lg:items-start">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </>
  );
}

export { Link };
