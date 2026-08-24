import * as React from "react";

/**
 * Hand-rolled icons.
 *
 * A full icon library is ~40 kB of JavaScript for the dozen glyphs this shop
 * actually uses. These are inline SVG, tree-shaken by definition, and render
 * on the server. Every one is `aria-hidden` — the accessible name always comes
 * from the surrounding control.
 */
type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({
  children,
  ...props
}: IconProps & { children: React.ReactNode }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="size-5"
      {...props}
    >
      {children}
    </svg>
  );
}

export const MenuIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Icon>
);

export const XIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const SearchIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </Icon>
);

export const CartIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.55L20.5 8H6" />
    <circle cx="10" cy="20" r="1.2" />
    <circle cx="17" cy="20" r="1.2" />
  </Icon>
);

export const HeartIcon = ({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }): React.JSX.Element => (
  <Icon fill={filled ? "currentColor" : "none"} {...props}>
    <path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.5 3c0 5-7.5 9.6-7.5 9.6Z" />
  </Icon>
);

export const UserIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Icon>
);

export const ChevronDownIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const ChevronRightIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

export const CheckIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
);

export const PrinterIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M6 4h12v5H6z" />
    <path d="M4 9h16v7H4z" />
    <path d="M8 16h8v4H8z" />
  </Icon>
);

export const SpoolIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
  </Icon>
);

export const TruckIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M2 6h11v10H2z" />
    <path d="M13 9h4.5l3.5 3.5V16H13z" />
    <circle cx="6.5" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Icon>
);

export const WarehouseIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M3 20V9l9-5 9 5v11" />
    <path d="M8 20v-6h8v6" />
  </Icon>
);

export const HeadsetIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <path d="M4 14h3v5H5.5A1.5 1.5 0 0 1 4 17.5zM20 14h-3v5h1.5a1.5 1.5 0 0 0 1.5-1.5z" />
    <path d="M17 19a3 3 0 0 1-3 2.5h-2" />
  </Icon>
);

export const ShieldIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const LeafIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M5 19c0-8 5-13 14-14 1 9-4 14-11 14H5z" />
    <path d="M5 19c3-4 6-6 10-7.5" />
  </Icon>
);

export const SparklesIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M18 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </Icon>
);

export const FilterIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M3 6h18M6.5 12h11M10 18h4" />
  </Icon>
);

export const ScaleIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M12 4v16M7 8h10" />
    <path d="m4 15 3-7 3 7a3 3 0 0 1-6 0ZM14 15l3-7 3 7a3 3 0 0 1-6 0Z" />
  </Icon>
);

export const AlertIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v5M12 16h.01" />
  </Icon>
);

export const ThermometerIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}>
    <path d="M13 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z" />
  </Icon>
);

/** Resolves a USP's configured icon name to a component. */
export const USP_ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  truck: TruckIcon,
  warehouse: WarehouseIcon,
  headset: HeadsetIcon,
  shield: ShieldIcon,
  leaf: LeafIcon,
  sparkles: SparklesIcon,
};
