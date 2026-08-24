import Link from "next/link";
import { EmptyState, buttonVariants } from "@nordprint/ui";

/**
 * The signed-out state for an account page.
 *
 * `retur` sends the customer back to the page they wanted after logging in,
 * rather than dumping everyone on the account overview.
 */
export function SignInRequired({
  title,
  description,
  returnTo,
  icon,
}: {
  readonly title: string;
  readonly description: string;
  readonly returnTo: string;
  readonly icon?: React.ReactNode;
}): React.JSX.Element {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href={`/konto/log-ind?retur=${encodeURIComponent(returnTo)}`}
            className={buttonVariants({})}
          >
            Log ind
          </Link>
          <Link
            href={`/konto/log-ind?opret&retur=${encodeURIComponent(returnTo)}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Opret konto
          </Link>
        </div>
      }
    />
  );
}
