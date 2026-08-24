import type { Metadata } from "next";
import { TechLabel } from "@nordprint/ui";
import { fetchPrinters } from "@/lib/api/catalog";
import { MyPrinters } from "@/components/account/my-printers";

export const metadata: Metadata = { title: "Mine printere" };

export const revalidate = 600;

export default async function MyPrintersPage(): Promise<React.JSX.Element> {
  const printers = await fetchPrinters();

  return (
    <div>
      <TechLabel>Kompatibilitet</TechLabel>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight">Mine printere</h2>
      <p className="mb-6 mt-1.5 max-w-2xl text-ink-soft">
        Når vi ved, hvad du printer på, kan vi svare på om en dyse, en byggeplade eller et filament
        passer — og sige det ligeud, når vi ikke ved det.
      </p>

      <MyPrinters brands={printers.brands} />
    </div>
  );
}
