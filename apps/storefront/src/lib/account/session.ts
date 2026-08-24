import "server-only";

import { cookies } from "next/headers";
import { apiFetch, type ApiResult } from "../api/client";

/**
 * Customer sessions.
 *
 * Medusa issues a JWT on login. It stays in an httpOnly cookie and is only
 * ever read on the server — a token in `localStorage` is a token any script
 * on the page can take.
 */

const TOKEN_COOKIE = "nordprint_customer_token";
/** Matches Medusa's default JWT lifetime; a longer cookie than token is a lie. */
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export interface Customer {
  readonly id: string;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly phone: string | null;
  readonly createdAt: string;
}

interface MedusaCustomer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
}

/**
 * The signed-in customer, or `null`.
 *
 * An expired or revoked token is treated as signed out rather than as an
 * error: the customer sees the login page, not a stack trace.
 */
export async function getCustomer(): Promise<Customer | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const result = await apiFetch<{ customer: MedusaCustomer }>("/store/customers/me", {
    token,
    revalidate: 0,
  });

  if (!result.ok) return null;

  return toCustomer(result.data.customer);
}

export function toCustomer(customer: MedusaCustomer): Customer {
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    createdAt: customer.created_at,
  };
}

/** Runs an authenticated request, or fails cleanly when signed out. */
export async function withCustomerToken<T>(
  run: (token: string) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const token = await getSessionToken();
  if (!token) {
    return { ok: false, status: 401, message: "Du er ikke logget ind." };
  }
  return run(token);
}

export const CUSTOMER_TOKEN_COOKIE = TOKEN_COOKIE;
