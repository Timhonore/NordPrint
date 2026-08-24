import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TechLabel } from "@nordprint/ui";
import { AuthForm } from "@/components/account/auth-form";
import { getCustomer } from "@/lib/account/session";

export const metadata: Metadata = {
  title: "Log ind",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  // Already signed in: send them where they were going instead of showing a
  // login form that would only confuse.
  if (await getCustomer()) {
    const params = await searchParams;
    const retur = Array.isArray(params["retur"]) ? params["retur"][0] : params["retur"];
    redirect(retur?.startsWith("/") && !retur.startsWith("//") ? retur : "/konto");
  }

  return (
    <div className="py-4">
      <TechLabel>Konto</TechLabel>
      <h2 className="mb-8 mt-1.5 text-xl font-bold tracking-tight">Log ind eller opret konto</h2>

      {/* AuthForm læser søgeparametre, så den skal ligge i en Suspense-grænse. */}
      <Suspense fallback={<div className="mx-auto h-96 w-full max-w-sm" />}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
