import type { Money } from "./catalog";

/**
 * Payment provider abstraction.
 *
 * Every provider — card PSP, Vipps MobilePay ePayment, Apple Pay, Google Pay,
 * or the development stub — implements the same lifecycle. The checkout UI
 * never talks to a provider SDK directly.
 */

export const PAYMENT_METHOD_KINDS = [
  "card",
  "mobilepay",
  "apple_pay",
  "google_pay",
  "invoice",
  "test",
] as const;
export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export type PaymentSessionStatus =
  | "pending"
  | "requires_action"
  | "authorized"
  | "captured"
  | "canceled"
  | "refunded"
  | "failed";

export interface PaymentContext {
  readonly cartId: string;
  readonly amount: Money;
  readonly customerEmail: string | null;
  readonly reference: string;
  /** Where the provider should send the customer back to. */
  readonly returnUrl: string;
  /** Provider-supplied idempotency key; reused verbatim on retry. */
  readonly idempotencyKey: string;
  readonly metadata?: Record<string, unknown>;
}

export interface PaymentSession {
  readonly id: string;
  readonly providerId: string;
  readonly status: PaymentSessionStatus;
  readonly amount: Money;
  /** Set when the customer must be redirected (MobilePay, 3DS). */
  readonly redirectUrl: string | null;
  /** Provider-side identifier used for capture/refund. */
  readonly providerReference: string | null;
  readonly data: Record<string, unknown>;
}

export interface PaymentResult {
  readonly status: PaymentSessionStatus;
  readonly providerReference: string | null;
  readonly amount: Money | null;
  readonly raw?: Record<string, unknown>;
}

export interface PaymentProviderInfo {
  readonly id: string;
  readonly kind: PaymentMethodKind;
  readonly label: string;
  readonly description: string | null;
  readonly logo: string | null;
  /** False when credentials are missing — the method is hidden in production. */
  readonly available: boolean;
  /** True only for the development stub. Never usable in production mode. */
  readonly isDevelopmentStub: boolean;
}

export interface PaymentProvider {
  readonly info: PaymentProviderInfo;
  initiate(context: PaymentContext): Promise<PaymentSession>;
  authorize(session: PaymentSession): Promise<PaymentResult>;
  capture(session: PaymentSession, amount?: Money): Promise<PaymentResult>;
  cancel(session: PaymentSession): Promise<PaymentResult>;
  refund(session: PaymentSession, amount: Money): Promise<PaymentResult>;
  status(session: PaymentSession): Promise<PaymentResult>;
}
