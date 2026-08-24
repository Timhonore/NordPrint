import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

/**
 * The one button.
 *
 * Colours come from the `@theme` tokens defined in the storefront's
 * `globals.css` (`--color-ink`, `--color-accent`, …), so a brand change is a
 * CSS change.
 *
 * Focus styling is deliberately part of every variant: keyboard users are the
 * ones who need a visible ring, and they are never the ones who ask for it.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "font-medium transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-strong",
        secondary: "border border-line bg-surface text-ink hover:bg-surface-muted",
        ghost: "text-ink hover:bg-surface-muted",
        danger: "bg-negative text-white hover:brightness-110",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm [&_svg]:size-4",
        md: "h-11 px-4 text-[0.9375rem] [&_svg]:size-4",
        lg: "h-13 px-6 text-base [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
      },
      full: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", full: false },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, full, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, full }), className)}
      {...props}
    />
  );
});

/**
 * Anchor styled as a button.
 *
 * Deliberately a separate component rather than an `asChild` prop: a link and
 * a button behave differently for keyboard users, screen readers and
 * middle-click, and blurring the two is how "buttons" that cannot be opened in
 * a new tab get shipped. If it navigates, it is an `<a>`.
 */
export interface LinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof buttonVariants> {}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  { className, variant, size, full, ...props },
  ref
) {
  return (
    <a ref={ref} className={cn(buttonVariants({ variant, size, full }), className)} {...props} />
  );
});

export { buttonVariants };
