import type { Logger } from "@medusajs/framework/types";

/**
 * Thin client for the **Vipps MobilePay ePayment API (v1)**.
 *
 * This is deliberately written against the current ePayment API, not the
 * legacy eCom API that most tutorials still show. The two are not compatible:
 * eCom is deprecated and new merchant agreements are not issued for it.
 *
 * References (the shapes below follow these):
 *   POST /accesstoken/get
 *   POST /epayment/v1/payments
 *   GET  /epayment/v1/payments/{reference}
 *   POST /epayment/v1/payments/{reference}/capture
 *   POST /epayment/v1/payments/{reference}/cancel
 *   POST /epayment/v1/payments/{reference}/refund
 */

export interface MobilePayOptions {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
  /** https://apitest.vipps.no for test, https://api.vipps.no for production. */
  apiUrl?: string;
  returnUrl?: string;
  systemName?: string;
  systemVersion?: string;
}

/** ePayment aggregate state. */
export type MobilePayState = "CREATED" | "ABORTED" | "EXPIRED" | "AUTHORIZED" | "TERMINATED";

export interface MobilePayAmount {
  currency: string;
  /** Minor units — 18900 = 189,00 DKK. */
  value: number;
}

export interface MobilePayPayment {
  reference: string;
  state: MobilePayState;
  aggregate: {
    authorizedAmount: MobilePayAmount;
    cancelledAmount: MobilePayAmount;
    capturedAmount: MobilePayAmount;
    refundedAmount: MobilePayAmount;
  };
  amount: MobilePayAmount;
  pspReference?: string;
}

export interface CreatePaymentResponse {
  reference: string;
  redirectUrl: string;
}

interface AccessToken {
  token: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export class MobilePayApiError extends Error {
  constructor(
    override readonly message: string,
    readonly status: number,
    readonly traceId?: string
  ) {
    super(message);
    this.name = "MobilePayApiError";
  }
}

const DEFAULT_API_URL = "https://apitest.vipps.no";
/** Refresh a little early so a request never races the expiry. */
const TOKEN_SAFETY_MARGIN_MS = 60_000;

export class MobilePayClient {
  private token: AccessToken | null = null;

  constructor(
    private readonly options: MobilePayOptions,
    private readonly logger: Logger
  ) {}

  private get baseUrl(): string {
    return (this.options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
  }

  /**
   * Access tokens are valid for about an hour. They are cached in memory —
   * never persisted, never logged.
   */
  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + TOKEN_SAFETY_MARGIN_MS) {
      return this.token.token;
    }

    const response = await fetch(`${this.baseUrl}/accesstoken/get`, {
      method: "POST",
      headers: {
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        "Ocp-Apim-Subscription-Key": this.options.subscriptionKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Never include the response body here — it can echo credentials.
      throw new MobilePayApiError(
        "Kunne ikke hente adgangstoken fra Vipps MobilePay",
        response.status
      );
    }

    const body = (await response.json()) as { access_token: string; expires_in: string };
    const expiresInSeconds = Number(body.expires_in);
    this.token = {
      token: body.access_token,
      expiresAt: Date.now() + (Number.isFinite(expiresInSeconds) ? expiresInSeconds : 3000) * 1000,
    };
    return this.token.token;
  }

  private async request<T>(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown; idempotencyKey?: string }
  ): Promise<T> {
    const token = await this.accessToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": this.options.subscriptionKey,
      "Merchant-Serial-Number": this.options.merchantSerialNumber,
      "Content-Type": "application/json",
      // Vipps MobilePay asks integrators to identify themselves; it makes
      // their support able to trace our traffic.
      "Vipps-System-Name": this.options.systemName ?? "nordprint",
      "Vipps-System-Version": this.options.systemVersion ?? "1.0.0",
      "Vipps-System-Plugin-Name": "nordprint-medusa",
      "Vipps-System-Plugin-Version": "1.0.0",
    };

    // Every mutating ePayment call requires an idempotency key. Reusing the
    // same key on a retry is what prevents a customer being charged twice
    // when the network drops mid-request.
    if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: init.method,
      headers,
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });

    const raw = await response.text();
    const parsed: unknown = raw ? safeJsonParse(raw) : null;

    if (!response.ok) {
      const problem = parsed as { detail?: string; title?: string; traceId?: string } | null;
      const message = problem?.detail ?? problem?.title ?? "Ukendt fejl fra Vipps MobilePay";
      this.logger.error(
        `[mobilepay] ${init.method} ${path} fejlede: ${response.status} ${message}` +
          (problem?.traceId ? ` (traceId ${problem.traceId})` : "")
      );
      throw new MobilePayApiError(message, response.status, problem?.traceId);
    }

    return parsed as T;
  }

  /** Creates a payment and returns the URL the customer must be sent to. */
  async createPayment(input: {
    reference: string;
    amount: MobilePayAmount;
    description: string;
    returnUrl: string;
    idempotencyKey: string;
    customerPhone?: string | null;
  }): Promise<CreatePaymentResponse> {
    return this.request<CreatePaymentResponse>("/epayment/v1/payments", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        amount: input.amount,
        paymentMethod: { type: "WALLET" },
        reference: input.reference,
        returnUrl: input.returnUrl,
        userFlow: "WEB_REDIRECT",
        paymentDescription: input.description.slice(0, 100),
        ...(input.customerPhone
          ? { customer: { phoneNumber: normalizePhone(input.customerPhone) } }
          : {}),
      },
    });
  }

  async getPayment(reference: string): Promise<MobilePayPayment> {
    return this.request<MobilePayPayment>(
      `/epayment/v1/payments/${encodeURIComponent(reference)}`,
      {
        method: "GET",
      }
    );
  }

  async capture(
    reference: string,
    amount: MobilePayAmount,
    idempotencyKey: string
  ): Promise<MobilePayPayment> {
    return this.request<MobilePayPayment>(
      `/epayment/v1/payments/${encodeURIComponent(reference)}/capture`,
      { method: "POST", idempotencyKey, body: { modificationAmount: amount } }
    );
  }

  async cancel(reference: string, idempotencyKey: string): Promise<MobilePayPayment> {
    return this.request<MobilePayPayment>(
      `/epayment/v1/payments/${encodeURIComponent(reference)}/cancel`,
      { method: "POST", idempotencyKey }
    );
  }

  async refund(
    reference: string,
    amount: MobilePayAmount,
    idempotencyKey: string
  ): Promise<MobilePayPayment> {
    return this.request<MobilePayPayment>(
      `/epayment/v1/payments/${encodeURIComponent(reference)}/refund`,
      { method: "POST", idempotencyKey, body: { modificationAmount: amount } }
    );
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Vipps MobilePay expects MSISDN without "+", e.g. 4512345678. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 8 ? `45${digits}` : digits;
}
