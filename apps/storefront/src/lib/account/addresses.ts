import "server-only";

import { apiFetch, type ApiResult } from "../api/client";
import { withCustomerToken } from "./session";

/** Saved delivery and billing addresses. */

export interface SavedAddress {
  readonly id: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly company: string | null;
  readonly address1: string | null;
  readonly address2: string | null;
  readonly postalCode: string | null;
  readonly city: string | null;
  readonly countryCode: string | null;
  readonly phone: string | null;
}

interface MedusaAddress {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address_1: string | null;
  address_2: string | null;
  postal_code: string | null;
  city: string | null;
  country_code: string | null;
  phone: string | null;
}

export async function fetchCustomerAddresses(): Promise<ApiResult<SavedAddress[]>> {
  const result = await withCustomerToken((token) =>
    apiFetch<{ addresses: MedusaAddress[] }>("/store/customers/me/addresses", {
      token,
      revalidate: 0,
    })
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.addresses.map((address) => ({
      id: address.id,
      firstName: address.first_name,
      lastName: address.last_name,
      company: address.company,
      address1: address.address_1,
      address2: address.address_2,
      postalCode: address.postal_code,
      city: address.city,
      countryCode: address.country_code,
      phone: address.phone,
    })),
  };
}
