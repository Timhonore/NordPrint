"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "../api/client";
import { validateEmail, validatePassword } from "./validation";
import {
  clearSessionToken,
  setSessionToken,
  withCustomerToken,
  type Customer,
  toCustomer,
} from "./session";

/**
 * Account actions.
 *
 * Every one returns a result instead of throwing, so a wrong password renders
 * an error next to the field rather than an error page. Failures are
 * deliberately vague about *which* half was wrong — telling an attacker that
 * an e-mail exists is telling them half the answer.
 */

export interface AccountResult {
  readonly ok: boolean;
  readonly message?: string;
  readonly customer?: Customer;
}

const GENERIC = "Noget gik galt. Prøv igen.";
const BAD_CREDENTIALS = "E-mail eller adgangskode passer ikke.";

export async function login(input: {
  email: string;
  password: string;
  /** Guest printers and favourites to fold into the account, if any. */
  guest?: GuestState;
}): Promise<AccountResult> {
  const email = input.email.trim().toLowerCase();

  const emailError = validateEmail(email);
  if (emailError) return { ok: false, message: emailError };
  if (input.password.length === 0) return { ok: false, message: BAD_CREDENTIALS };

  const auth = await apiFetch<{ token: string }>("/auth/customer/emailpass", {
    method: "POST",
    body: { email, password: input.password },
    revalidate: 0,
  });

  if (!auth.ok) return { ok: false, message: BAD_CREDENTIALS };

  await setSessionToken(auth.data.token);
  await mergeGuestState(auth.data.token, input.guest);

  revalidatePath("/konto", "layout");
  return { ok: true };
}

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  guest?: GuestState;
}): Promise<AccountResult> {
  const email = input.email.trim().toLowerCase();

  const emailError = validateEmail(email);
  if (emailError) return { ok: false, message: emailError };

  const passwordError = validatePassword(input.password);
  if (passwordError) return { ok: false, message: passwordError };

  if (input.firstName.trim().length === 0) return { ok: false, message: "Indtast dit fornavn." };

  const auth = await apiFetch<{ token: string }>("/auth/customer/emailpass/register", {
    method: "POST",
    body: { email, password: input.password },
    revalidate: 0,
  });

  if (!auth.ok) {
    // Medusa answers 401/422 when the identity already exists. Saying so
    // outright would confirm the address to anyone who asks, so we point at
    // the login instead.
    return {
      ok: false,
      message: "Kontoen kunne ikke oprettes. Har du allerede en konto med den e-mail?",
    };
  }

  const created = await apiFetch<{ customer: Parameters<typeof toCustomer>[0] }>(
    "/store/customers",
    {
      method: "POST",
      token: auth.data.token,
      body: {
        email,
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
      },
      revalidate: 0,
    }
  );

  if (!created.ok) return { ok: false, message: GENERIC };

  // The registration token carries an empty `actor_id` — the customer did not
  // exist yet when it was issued, so every /store/customers call with it comes
  // back 401. Refreshing mints a token that actually identifies the customer.
  // Without this the account is created and the customer lands on a page that
  // insists they are signed out.
  const refreshed = await apiFetch<{ token: string }>("/auth/token/refresh", {
    method: "POST",
    token: auth.data.token,
    revalidate: 0,
  });

  if (!refreshed.ok) {
    // The account exists; only the session does not. Sending them to the login
    // form is honest and recoverable.
    return {
      ok: false,
      message: "Kontoen er oprettet. Log ind for at fortsætte.",
    };
  }

  await setSessionToken(refreshed.data.token);
  await mergeGuestState(refreshed.data.token, input.guest);

  revalidatePath("/konto", "layout");
  return { ok: true, customer: toCustomer(created.data.customer) };
}

export async function logout(): Promise<void> {
  await clearSessionToken();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<AccountResult> {
  const result = await withCustomerToken((token) =>
    apiFetch<{ customer: Parameters<typeof toCustomer>[0] }>("/store/customers/me", {
      method: "POST",
      token,
      body: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: input.phone.trim() || null,
      },
      revalidate: 0,
    })
  );

  if (!result.ok) return { ok: false, message: result.message ?? GENERIC };

  revalidatePath("/konto/profil");
  return { ok: true, customer: toCustomer(result.data.customer) };
}

/**
 * GDPR: a machine-readable copy of everything we hold on the customer.
 *
 * Assembled by the backend, because only the backend knows every module that
 * stores something — orders, addresses, printers, favourites, reviews.
 */
export async function requestDataExport(): Promise<
  { ok: true; data: unknown } | { ok: false; message: string }
> {
  const result = await withCustomerToken((token) =>
    apiFetch<unknown>("/store/nordprint/me/data-export", { token, revalidate: 0 })
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.status === 401 ? "Log ind for at hente dine data." : GENERIC,
    };
  }

  return { ok: true, data: result.data };
}

export async function requestAccountDeletion(): Promise<AccountResult> {
  const result = await withCustomerToken((token) =>
    apiFetch<{ requestedAt: string }>("/store/nordprint/me/deletion-request", {
      method: "POST",
      token,
      revalidate: 0,
    })
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.status === 401 ? "Log ind for at anmode om sletning." : GENERIC,
    };
  }

  revalidatePath("/konto/profil");
  return { ok: true };
}

export interface GuestState {
  readonly printerModelIds: readonly string[];
  readonly wishlist: readonly { productId: string; variantId: string | null }[];
}

/**
 * Folds the guest's printers and favourites into the account.
 *
 * Best effort on purpose: a customer who just logged in successfully must not
 * be told the login failed because a favourite could not be copied. The two
 * merges are independent, so one failing does not cost the other.
 */
async function mergeGuestState(token: string, guest: GuestState | undefined): Promise<void> {
  if (!guest) return;

  const work: Promise<unknown>[] = [];

  if (guest.wishlist.length > 0) {
    work.push(
      apiFetch("/store/nordprint/wishlist/merge", {
        method: "POST",
        token,
        // A corrupted local-storage payload must not become an unbounded insert.
        body: { items: guest.wishlist.slice(0, 200) },
        revalidate: 0,
      })
    );
  }

  if (guest.printerModelIds.length > 0) {
    work.push(
      apiFetch("/store/nordprint/me/printers", {
        method: "POST",
        token,
        body: { merge: guest.printerModelIds.slice(0, 20) },
        revalidate: 0,
      })
    );
  }

  await Promise.allSettled(work);
}
