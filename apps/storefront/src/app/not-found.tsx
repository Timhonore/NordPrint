import Link from "next/link";
import { buttonVariants } from "@nordprint/ui";

export const metadata = {
  title: "Siden findes ikke",
  robots: { index: false, follow: false },
};

/** 404. A dead end should still offer a way forward. */
export default function NotFound(): React.JSX.Element {
  return (
    <div className="container-page flex min-h-[60vh] max-w-lg flex-col items-center justify-center py-16 text-center">
      <p className="font-mono text-6xl font-bold tracking-tight text-line-strong">404</p>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Siden findes ikke</h1>
      <p className="mt-2 text-ink-soft">
        Linket er måske forældet, eller produktet er taget ud af sortimentet.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonVariants({})}>
          Til forsiden
        </Link>
        <Link href="/filament" className={buttonVariants({ variant: "secondary" })}>
          Se alt filament
        </Link>
        <Link href="/find-filament" className={buttonVariants({ variant: "ghost" })}>
          Find filament
        </Link>
      </div>
    </div>
  );
}
