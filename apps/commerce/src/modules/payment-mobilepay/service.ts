import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentSessionStatus,
} from "@medusajs/framework/utils";
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";
import { MobilePayClient, type MobilePayOptions, type MobilePayPayment } from "./client";

type SessionData = {
  reference: string;
  redirectUrl?: string;
  /** Reused verbatim on every retry of the same operation. */
  idempotencyKey: string;
  currency: string;
};

/**
 * MobilePay via the Vipps MobilePay ePayment API.
 *
 * Lifecycle mapping:
 *
 *   initiate  → POST /epayment/v1/payments  (returns redirectUrl)
 *   authorize → GET  …/{reference}          (state must be AUTHORIZED)
 *   capture   → POST …/{reference}/capture
 *   cancel    → POST …/{reference}/cancel
 *   refund    → POST …/{reference}/refund
 *   status    → GET  …/{reference}
 *
 * Authorisation is *not* assumed after the redirect: the state is always read
 * back from Vipps MobilePay before an order is created. A customer returning
 * to the return URL proves nothing on its own.
 */
class MobilePayProviderService extends AbstractPaymentProvider<MobilePayOptions> {
  static override identifier = "mobilepay";

  protected readonly logger_: Logger;
  protected readonly options_: MobilePayOptions;
  protected readonly client_: MobilePayClient;

  static override validateOptions(options: Record<string, unknown>): void {
    const required = [
      "clientId",
      "clientSecret",
      "subscriptionKey",
      "merchantSerialNumber",
    ] as const;
    const missing = required.filter((key) => !options[key]);
    if (missing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        `MobilePay mangler konfiguration: ${missing.join(", ")}`
      );
    }
  }

  constructor(container: { logger: Logger }, options: MobilePayOptions) {
    super(container, options);
    this.logger_ = container.logger;
    this.options_ = options;
    this.client_ = new MobilePayClient(options, container.logger);
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amount = toMinorUnits(input.amount);
    const currency = input.currency_code.toUpperCase();
    const context = (input.context ?? {}) as Record<string, any>;

    // The reference must be unique per payment attempt and is what ties the
    // Vipps MobilePay payment back to our session.
    const reference = `nordprint-${input.data?.session_id ?? cryptoRandom()}`;
    const idempotencyKey = cryptoRandom();

    const returnUrl =
      (context.return_url as string | undefined) ??
      this.options_.returnUrl ??
      "http://localhost:8000/checkout/retur";

    const response = await this.client_.createPayment({
      reference,
      amount: { currency, value: amount },
      description: `NordPrint ordre ${reference}`.slice(0, 100),
      returnUrl,
      idempotencyKey,
      customerPhone: context.customer?.phone ?? context.phone ?? null,
    });

    const data: SessionData = {
      reference: response.reference,
      redirectUrl: response.redirectUrl,
      idempotencyKey,
      currency,
    };

    return { id: response.reference, data: data as unknown as Record<string, unknown> };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const session = this.readSession(input.data);
    const payment = await this.client_.getPayment(session.reference);

    return {
      status: this.mapState(payment),
      data: { ...session, state: payment.state } as unknown as Record<string, unknown>,
    };
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const session = this.readSession(input.data);
    const payment = await this.client_.getPayment(session.reference);

    // Idempotent by design: capturing an already-captured payment is a no-op
    // rather than an error, because Medusa may retry the workflow step.
    if (payment.aggregate.capturedAmount.value >= payment.aggregate.authorizedAmount.value) {
      return { data: { ...session, state: payment.state } as unknown as Record<string, unknown> };
    }

    const captured = await this.client_.capture(
      session.reference,
      payment.aggregate.authorizedAmount,
      `${session.idempotencyKey}-capture`
    );

    return { data: { ...session, state: captured.state } as unknown as Record<string, unknown> };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const session = this.readSession(input.data);
    try {
      await this.client_.cancel(session.reference, `${session.idempotencyKey}-cancel`);
    } catch (error) {
      // A payment that was never authorised cannot be cancelled — that is a
      // successful outcome for us, not a failure.
      this.logger_.warn(
        `[mobilepay] annullering af ${session.reference} kunne ikke gennemføres: ${describe(error)}`
      );
    }
    return { data: session as unknown as Record<string, unknown> };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input);
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const session = this.readSession(input.data);
    const amount = toMinorUnits(input.amount);

    const refunded = await this.client_.refund(
      session.reference,
      { currency: session.currency, value: amount },
      // A distinct key per refund amount: two partial refunds of the same
      // size are two different operations and must both go through.
      `${session.idempotencyKey}-refund-${amount}-${Date.now()}`
    );

    return { data: { ...session, state: refunded.state } as unknown as Record<string, unknown> };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const session = this.readSession(input.data);
    const payment = await this.client_.getPayment(session.reference);
    return { data: payment as unknown as Record<string, unknown> };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const session = this.readSession(input.data);
    const payment = await this.client_.getPayment(session.reference);
    return { status: this.mapState(payment) };
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // ePayment payments are immutable once created. Changing the amount means
    // cancelling and initiating a new payment, which is what Medusa does when
    // the cart changes.
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const data = payload.data as Record<string, any>;
    const reference: string = data?.reference ?? "";
    const amountValue: number = data?.amount?.value ?? 0;

    const notFound: WebhookActionResult = {
      action: "not_supported",
      data: { session_id: reference, amount: new BigNumber(0) },
    };

    if (!reference) return notFound;

    switch (data?.name) {
      case "AUTHORIZED":
        return {
          action: "authorized",
          data: { session_id: reference, amount: new BigNumber(amountValue) },
        };
      case "CAPTURED":
        return {
          action: "captured",
          data: { session_id: reference, amount: new BigNumber(amountValue) },
        };
      case "CANCELLED":
      case "ABORTED":
      case "EXPIRED":
        return {
          action: "canceled",
          data: { session_id: reference, amount: new BigNumber(amountValue) },
        };
      default:
        return notFound;
    }
  }

  /**
   * Maps the ePayment aggregate onto Medusa's session status.
   * Capture is detected from the aggregate rather than the state, because
   * `state` stays AUTHORIZED after a partial capture.
   */
  private mapState(payment: MobilePayPayment): PaymentSessionStatus {
    const { authorizedAmount, capturedAmount, cancelledAmount } = payment.aggregate;

    if (capturedAmount.value > 0 && capturedAmount.value >= authorizedAmount.value) {
      return PaymentSessionStatus.CAPTURED;
    }
    if (cancelledAmount.value > 0) return PaymentSessionStatus.CANCELED;

    switch (payment.state) {
      case "AUTHORIZED":
        return PaymentSessionStatus.AUTHORIZED;
      case "ABORTED":
      case "EXPIRED":
      case "TERMINATED":
        return PaymentSessionStatus.CANCELED;
      case "CREATED":
      default:
        return PaymentSessionStatus.PENDING;
    }
  }

  private readSession(data: Record<string, unknown> | undefined): SessionData {
    const reference = data?.reference;
    if (typeof reference !== "string" || reference.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "MobilePay-sessionen mangler en reference"
      );
    }
    return {
      reference,
      idempotencyKey: (data?.idempotencyKey as string) ?? reference,
      currency: (data?.currency as string) ?? "DKK",
      redirectUrl: data?.redirectUrl as string | undefined,
    };
  }
}

/** Medusa hands amounts as BigNumberInput in major units. */
function toMinorUnits(amount: unknown): number {
  const numeric = typeof amount === "number" ? amount : Number(amount?.toString() ?? 0);
  if (!Number.isFinite(numeric)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Ugyldigt beløb");
  }
  return Math.round(numeric * 100);
}

function cryptoRandom(): string {
  return globalThis.crypto.randomUUID();
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default MobilePayProviderService;
