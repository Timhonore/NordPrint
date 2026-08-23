"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { DeliveryKind, PickupPoint, ShippingOption } from "@nordprint/types";
import { commerceConfig } from "@nordprint/config";
import { apiFetch } from "../api/client";
import { clearCartId, getCartId } from "../cart/cart";

/**
 * Checkout server actions.
 *
 * Every step writes to the Medusa cart and reads the result back. Nothing
 * about the order — price, shipping cost, discount, stock — is decided in the
 * browser, so a customer editing the page cannot change what they pay.
 */

export interface CheckoutResult {
  readonly ok: boolean;
  readonly message?: string;
  readonly fieldErrors?: Record<string, string>;
}

const GENERIC = "Noget gik galt. Prøv igen.";

/* --------------------------------------------------------------- contact */

export async function saveContactAndAddress(
  _previous: CheckoutResult | null,
  formData: FormData
): Promise<CheckoutResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, message: "Kurven blev ikke fundet." };

  const values = {
    email: String(formData.get("email") ?? "").trim(),
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address1: String(formData.get("address1") ?? "").trim(),
    address2: String(formData.get("address2") ?? "").trim(),
    postalCode: String(formData.get("postalCode") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    countryCode: String(formData.get("countryCode") ?? commerceConfig.defaultCountry).trim(),
    company: String(formData.get("company") ?? "").trim(),
  };

  // Validated server-side as well as in the browser: HTML validation is a
  // convenience, not a guarantee.
  const fieldErrors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
    fieldErrors.email = "Indtast en gyldig e-mailadresse.";
  }
  if (values.firstName.length === 0) fieldErrors.firstName = "Skriv dit fornavn.";
  if (values.lastName.length === 0) fieldErrors.lastName = "Skriv dit efternavn.";
  if (values.address1.length === 0) fieldErrors.address1 = "Skriv din adresse.";
  if (values.countryCode === "dk" && !/^\d{4}$/.test(values.postalCode)) {
    fieldErrors.postalCode = "Et dansk postnummer er fire cifre.";
  }
  if (values.city.length === 0) fieldErrors.city = "Skriv din by.";
  if (values.phone.replace(/\D/g, "").length < 8) {
    fieldErrors.phone = "Vi bruger telefonnummeret til fragtbeskeder.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, message: "Ret felterne markeret nedenfor." };
  }

  const address = {
    first_name: values.firstName,
    last_name: values.lastName,
    address_1: values.address1,
    address_2: values.address2 || null,
    postal_code: values.postalCode,
    city: values.city,
    country_code: values.countryCode,
    phone: values.phone,
    company: values.company || null,
  };

  const result = await apiFetch(`/store/carts/${cartId}`, {
    method: "POST",
    body: {
      email: values.email,
      shipping_address: address,
      // Billing defaults to the shipping address; a separate billing address
      // is a rare enough case to be a later addition, not a required field.
      billing_address: address,
    },
    revalidate: 0,
  });

  if (!result.ok) return { ok: false, message: result.message ?? GENERIC };

  revalidatePath("/checkout");
  return { ok: true };
}

/* -------------------------------------------------------------- shipping */

interface MedusaShippingOption {
  id: string;
  name: string;
  amount: number | null;
  price_type: string;
  data?: Record<string, unknown>;
  provider_id?: string;
}

export async function listShippingOptions(): Promise<ShippingOption[]> {
  const cartId = await getCartId();
  if (!cartId) return [];

  const result = await apiFetch<{ shipping_options: MedusaShippingOption[] }>(
    `/store/shipping-options?cart_id=${cartId}`,
    { revalidate: 0 }
  );
  if (!result.ok) return [];

  return result.data.shipping_options.map((option) => {
    const carrierId = String(option.data?.carrier_id ?? "manual");
    const kind = (option.data?.kind as DeliveryKind) ?? "home";

    return {
      id: option.id,
      carrierId,
      carrierName: option.name.split(" — ")[0] ?? option.name,
      name: option.name,
      kind,
      price: {
        amount: Math.round((option.amount ?? 0) * 100),
        currencyCode: commerceConfig.currency,
      },
      estimatedDeliveryDays: null,
      requiresPickupPoint: kind === "pickup_point",
      logo: null,
    };
  });
}

export async function listPickupPoints(
  postalCode: string,
  carrierId: string
): Promise<PickupPoint[]> {
  if (!/^\d{4}$/.test(postalCode)) return [];

  const result = await apiFetch<{
    carriers: { carrierId: string; points: PickupPoint[] }[];
  }>(
    `/store/nordprint/pickup-points?postal_code=${postalCode}&carrier=${encodeURIComponent(carrierId)}`,
    { revalidate: 60 }
  );

  if (!result.ok) return [];
  return result.data.carriers.flatMap((carrier) => carrier.points);
}

export async function selectShippingMethod(input: {
  optionId: string;
  pickupPointId?: string | null;
  pickupPointName?: string | null;
}): Promise<CheckoutResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, message: "Kurven blev ikke fundet." };

  const result = await apiFetch(`/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    body: {
      option_id: input.optionId,
      ...(input.pickupPointId
        ? {
            data: {
              pickup_point_id: input.pickupPointId,
              pickup_point_name: input.pickupPointName ?? null,
            },
          }
        : {}),
    },
    revalidate: 0,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: /pakkeshop/i.test(result.message)
        ? "Vælg en pakkeshop, før du går videre."
        : (result.message ?? GENERIC),
    };
  }

  revalidatePath("/checkout");
  return { ok: true };
}

/* --------------------------------------------------------------- payment */

export interface PaymentMethodOption {
  readonly id: string;
  readonly label: string;
  readonly description: string | null;
  readonly isDevelopmentStub: boolean;
}

const PROVIDER_LABELS: Record<string, { label: string; description: string | null }> = {
  pp_mobilepay_mobilepay: {
    label: "MobilePay",
    description: "Betal med MobilePay på din telefon.",
  },
  pp_system_default: { label: "Faktura", description: "Betaling efter aftale." },
  pp_development_development: {
    label: "Testbetaling (udvikling)",
    description: "Ingen rigtige penge flyttes. Kun tilgængelig uden for produktion.",
  },
};

export async function listPaymentMethods(): Promise<PaymentMethodOption[]> {
  const cartId = await getCartId();
  if (!cartId) return [];

  const cart = await apiFetch<{ cart: { region_id: string } }>(`/store/carts/${cartId}`, {
    revalidate: 0,
  });
  if (!cart.ok) return [];

  const result = await apiFetch<{
    payment_providers: { id: string; is_enabled: boolean }[];
  }>(`/store/payment-providers?region_id=${cart.data.cart.region_id}`, { revalidate: 0 });

  if (!result.ok) return [];

  return result.data.payment_providers
    .filter((provider) => provider.is_enabled !== false)
    .map((provider) => {
      const meta = PROVIDER_LABELS[provider.id] ?? { label: provider.id, description: null };
      return {
        id: provider.id,
        label: meta.label,
        description: meta.description,
        isDevelopmentStub: provider.id.includes("development"),
      };
    });
}

export async function initiatePayment(providerId: string): Promise<CheckoutResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, message: "Kurven blev ikke fundet." };

  const collection = await apiFetch<{ payment_collection: { id: string } }>(
    "/store/payment-collections",
    { method: "POST", body: { cart_id: cartId }, revalidate: 0 }
  );
  if (!collection.ok) return { ok: false, message: collection.message ?? GENERIC };

  const session = await apiFetch(
    `/store/payment-collections/${collection.data.payment_collection.id}/payment-sessions`,
    { method: "POST", body: { provider_id: providerId }, revalidate: 0 }
  );

  if (!session.ok) return { ok: false, message: session.message ?? GENERIC };

  revalidatePath("/checkout");
  return { ok: true };
}

/* -------------------------------------------------------------- complete */

interface CompleteResponse {
  type: "order" | "cart";
  order?: { id: string; display_id: number };
  cart?: { id: string };
  error?: { message: string };
}

/**
 * Places the order.
 *
 * On success the cart cookie is cleared before redirecting, so a refresh on
 * the confirmation page cannot resurrect a completed cart.
 */
export async function completeOrder(): Promise<CheckoutResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, message: "Kurven blev ikke fundet." };

  const result = await apiFetch<CompleteResponse>(`/store/carts/${cartId}/complete`, {
    method: "POST",
    revalidate: 0,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: /inventory|stock/i.test(result.message)
        ? "En vare blev udsolgt, mens du var i gang. Gå tilbage til kurven og se den igennem."
        : (result.message ?? "Betalingen kunne ikke gennemføres."),
    };
  }

  if (result.data.type !== "order" || !result.data.order) {
    return {
      ok: false,
      message: result.data.error?.message ?? "Betalingen kunne ikke gennemføres.",
    };
  }

  const orderId = result.data.order.id;
  await clearCartId();

  redirect(`/ordre/${orderId}`);
}
