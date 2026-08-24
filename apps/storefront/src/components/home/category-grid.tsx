import Link from "next/link";
import {
  SpoolIcon,
  PrinterIcon,
  ThermometerIcon,
  ScaleIcon,
  TruckIcon,
  LeafIcon,
} from "@/components/icons";

/**
 * Front-page category tiles.
 *
 * The list is short on purpose: six real entry points beat twenty that nobody
 * reads. Deeper navigation lives in the mega-menu.
 */
interface CategoryTile {
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly Icon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
  /** The lead tile spans two columns. */
  readonly featured?: boolean;
}

const CATEGORIES: readonly CategoryTile[] = [
  {
    title: "Filament",
    description: "PLA, PETG, ASA, TPU og teknisk",
    href: "/filament",
    Icon: SpoolIcon,
    featured: true,
  },
  {
    title: "3D-printere",
    description: "Maskiner og opgraderinger",
    href: "/3d-printere",
    Icon: PrinterIcon,
  },
  {
    title: "Dyser & hotends",
    description: "Messing, hærdet stål og keramik",
    href: "/reservedele/dyser",
    Icon: ThermometerIcon,
  },
  {
    title: "Build plates",
    description: "PEI, textured og glat",
    href: "/reservedele/build-plates",
    Icon: ScaleIcon,
  },
  {
    title: "Tørring & opbevaring",
    description: "Hold filamentet tørt",
    href: "/tilbehoer/filamenttoerrere",
    Icon: LeafIcon,
  },
  {
    title: "Værktøj",
    description: "Efterbehandling og vedligehold",
    href: "/vaerktoej",
    Icon: TruckIcon,
  },
];

export function CategoryGrid(): React.JSX.Element {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {CATEGORIES.map(({ title, description, href, Icon, featured }) => (
        <li key={href} className={featured ? "col-span-2 lg:col-span-2" : ""}>
          <Link
            href={href}
            className="group flex h-full flex-col justify-between gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-muted"
          >
            <Icon className="size-6 text-accent" />
            <span>
              <span className="block text-sm font-semibold text-ink">{title}</span>
              <span className="mt-0.5 block text-xs text-ink-soft">{description}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
