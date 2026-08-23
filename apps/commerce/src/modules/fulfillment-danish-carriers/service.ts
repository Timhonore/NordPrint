import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils";
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  Logger,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types";
import type { DeliveryKind } from "@nordprint/types";
import { commerceConfig } from "@nordprint/config";
import { CARRIERS, carrierById, carrierIsLive, resolveAdapter } from "./carriers";

type OptionData = {
  carrier_id: string;
  kind: DeliveryKind;
};

/**
 * Danish carriers as a single Medusa fulfilment provider.
 *
 * One provider exposing many options (GLS pakkeshop, DAO hjemmelevering, …)
 * rather than one provider per carrier: the carriers differ in credentials and
 * endpoints, not in how Medusa needs to talk to them, and this keeps adding a
 * fourth carrier to a data change.
 *
 * Free shipping is applied here, from `@nordprint/config`, so the threshold
 * the cart promises and the price checkout charges cannot drift apart.
 */
class DanishCarriersFulfillmentService extends AbstractFulfillmentProviderService {
  static override identifier = "danish-carriers";

  protected readonly logger_: Logger;

  constructor(container: { logger: Logger }) {
    super();
    this.logger_ = container.logger;

    const stubbed = CARRIERS.filter((carrier) => !carrierIsLive(carrier));
    if (stubbed.length > 0) {
      this.logger_.warn(
        `[fragt] Udviklings-fragtudbyder aktiv for: ${stubbed.map((c) => c.name).join(", ")}. ` +
          `Sæt ${stubbed.map((c) => c.credentialEnvKey).join(", ")} før produktion.`
      );
    }
  }

  /** One option per carrier × delivery kind. */
  override async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return CARRIERS.flatMap((carrier) =>
      carrier.kinds.map((kind) => ({
        id: `${carrier.id}-${kind}`,
        name: `${carrier.name} — ${KIND_LABELS[kind]}`,
        carrier_id: carrier.id,
        kind,
        is_return: false,
      }))
    );
  }

  override async validateOption(data: Record<string, unknown>): Promise<boolean> {
    const option = data as Partial<OptionData>;
    const carrier = option.carrier_id ? carrierById(option.carrier_id) : undefined;
    if (!carrier) return false;
    return carrier.kinds.includes(option.kind as DeliveryKind);
  }

  /**
   * Pickup-point deliveries are only valid once the customer has actually
   * chosen a shop. Letting this through would produce an order the warehouse
   * cannot ship.
   */
  override async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    const option = optionData as Partial<OptionData>;

    if (option.kind === "pickup_point" && !data.pickup_point_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Vælg en pakkeshop før du går videre"
      );
    }

    return { ...data, carrier_id: option.carrier_id, kind: option.kind };
  }

  override async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    return true;
  }

  override async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    const option = optionData as unknown as Partial<OptionData>;
    const carrier = option.carrier_id ? carrierById(option.carrier_id) : undefined;

    if (!carrier || !option.kind) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Ukendt fragtmetode");
    }

    const subtotalMinor = toMinorUnits((context as any)?.item_total ?? (context as any)?.total ?? 0);
    const threshold = commerceConfig.shipping.freeShippingThreshold;

    // Free shipping applies to parcel deliveries. Business delivery is a
    // negotiated service and is always charged.
    const qualifiesForFree =
      threshold > 0 && subtotalMinor >= threshold && option.kind !== "business";

    const price = qualifiesForFree ? 0 : carrier.baseRates[option.kind];

    return {
      calculated_amount: fromMinorUnits(price),
      // VAT is included in Danish consumer prices.
      is_calculated_price_tax_inclusive: commerceConfig.pricesIncludeVat,
    };
  }

  override async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    _fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    const carrierId = String(data.carrier_id ?? "");
    const carrier = carrierById(carrierId);

    if (!carrier) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Ukendt fragtfirma: ${carrierId}`);
    }

    const adapter = resolveAdapter(carrier);
    const shipment = await adapter.createShipment({
      orderId: String(order?.id ?? "ukendt"),
      kind: (data.kind as DeliveryKind) ?? "home",
      weightG: Number(data.weight_g ?? 0),
      pickupPointId: (data.pickup_point_id as string) ?? null,
    });

    return {
      data: {
        ...data,
        tracking_number: shipment.trackingNumber,
        tracking_url: shipment.trackingUrl,
        label_url: shipment.labelUrl,
        is_development_stub: adapter.isDevelopmentStub,
      },
      labels: shipment.labelUrl
        ? [
            {
              tracking_number: shipment.trackingNumber,
              tracking_url: shipment.trackingUrl,
              label_url: shipment.labelUrl,
            },
          ]
        : [],
    };
  }

  override async cancelFulfillment(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.logger_.info(
      `[fragt] Annullerer forsendelse ${String(data.tracking_number ?? "uden nummer")}`
    );
    return { ...data, canceled: true };
  }
}

const KIND_LABELS: Record<DeliveryKind, string> = {
  pickup_point: "pakkeshop",
  home: "hjemmelevering",
  business: "erhvervslevering",
};

const toMinorUnits = (amount: unknown): number => {
  const numeric = typeof amount === "number" ? amount : Number(amount?.toString() ?? 0);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
};

const fromMinorUnits = (minor: number): number => minor / 100;

export default DanishCarriersFulfillmentService;
