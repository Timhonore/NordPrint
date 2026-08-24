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

type DevSessionData = {
  reference: string;
  status: PaymentSessionStatus;
  authorized: number;
  captured: number;
  refunded: number;
  currency: string;
  /** Set from the cart so tests can force a specific outcome. */
  scenario: DevScenario;
};

type DevScenario = "success" | "declined" | "requires_action";

/**
 * Development payment provider.
 *
 * It exists so the rest of the shop — cart, checkout, order flow, e-mails,
 * refunds — can be built and tested before real acquirer credentials exist.
 *
 * ## It refuses to run in production
 *
 * `medusa-config.ts` only registers this provider when `NODE_ENV !== production`,
 * and the constructor throws if that guard is ever bypassed. A stub must never
 * be able to tell a customer "betaling gennemført" for money that was never
 * moved.
 *
 * ## Test scenarios
 *
 * The cart's payment context may carry `dev_payment_scenario`:
 *   - "success"          → authorises and captures normally (default)
 *   - "declined"         → authorisation fails, so the error path is testable
 *   - "requires_action"  → stays pending until authorize is called twice
 */
class DevelopmentPaymentProviderService extends AbstractPaymentProvider<Record<string, unknown>> {
  static override identifier = "development";

  protected readonly logger_: Logger;

  constructor(container: { logger: Logger }, options: Record<string, unknown>) {
    super(container, options);
    this.logger_ = container.logger;

    if (process.env.NODE_ENV === "production") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Udviklings-betalingsudbyderen må aldrig køre i produktion. " +
          "Konfigurer en rigtig udbyder (fx Vipps MobilePay) før go-live."
      );
    }

    this.logger_.warn(
      "[betaling] Udviklings-betalingsudbyderen er aktiv. Ingen rigtige penge flyttes. " +
        "Se docs/payments.md for hvad der mangler før produktion."
    );
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const context = (input.context ?? {}) as Record<string, any>;
    const scenario = readScenario(
      context.extra?.dev_payment_scenario ?? context.dev_payment_scenario
    );
    const reference = `dev-${globalThis.crypto.randomUUID()}`;

    const data: DevSessionData = {
      reference,
      status: PaymentSessionStatus.PENDING,
      authorized: 0,
      captured: 0,
      refunded: 0,
      currency: input.currency_code.toUpperCase(),
      scenario,
    };

    return { id: reference, data: data as unknown as Record<string, unknown> };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const session = this.read(input.data);
    const amount = toMinorUnits(input.data?.amount ?? 0);

    if (session.scenario === "declined") {
      return {
        status: PaymentSessionStatus.ERROR,
        data: {
          ...session,
          status: PaymentSessionStatus.ERROR,
          decline_reason: "Testscenarie: betalingen blev afvist",
        } as unknown as Record<string, unknown>,
      };
    }

    if (session.scenario === "requires_action" && session.status === PaymentSessionStatus.PENDING) {
      return {
        status: PaymentSessionStatus.REQUIRES_MORE,
        data: {
          ...session,
          status: PaymentSessionStatus.REQUIRES_MORE,
        } as unknown as Record<string, unknown>,
      };
    }

    const next: DevSessionData = {
      ...session,
      status: PaymentSessionStatus.AUTHORIZED,
      authorized: amount || session.authorized,
    };
    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: next as unknown as Record<string, unknown>,
    };
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const session = this.read(input.data);
    const next: DevSessionData = {
      ...session,
      status: PaymentSessionStatus.CAPTURED,
      captured: session.authorized,
    };
    return { data: next as unknown as Record<string, unknown> };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const session = this.read(input.data);
    return {
      data: {
        ...session,
        status: PaymentSessionStatus.CANCELED,
      } as unknown as Record<string, unknown>,
    };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const session = this.read(input.data);
    const amount = toMinorUnits(input.amount);

    if (amount > session.captured - session.refunded) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Kan ikke refundere mere end det opkrævede beløb"
      );
    }

    return {
      data: { ...session, refunded: session.refunded + amount } as unknown as Record<
        string,
        unknown
      >,
    };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const session = this.read(input.data);
    return { status: session.status };
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: "not_supported", data: { session_id: "", amount: new BigNumber(0) } };
  }

  private read(data: Record<string, unknown> | undefined): DevSessionData {
    return {
      reference: (data?.reference as string) ?? "dev-unknown",
      status: (data?.status as PaymentSessionStatus) ?? PaymentSessionStatus.PENDING,
      authorized: Number(data?.authorized ?? 0),
      captured: Number(data?.captured ?? 0),
      refunded: Number(data?.refunded ?? 0),
      currency: (data?.currency as string) ?? "DKK",
      scenario: readScenario(data?.scenario),
    };
  }
}

function readScenario(value: unknown): DevScenario {
  return value === "declined" || value === "requires_action" ? value : "success";
}

function toMinorUnits(amount: unknown): number {
  const numeric = typeof amount === "number" ? amount : Number(amount?.toString() ?? 0);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

export default DevelopmentPaymentProviderService;
