import type { Money } from "./catalog";
import type { Address } from "./order";

/**
 * Shipping provider abstraction covering the Danish carriers NordPrint plans
 * to use (GLS, DAO, PostNord) plus a development provider that works without
 * credentials.
 */

export const DELIVERY_KINDS = ["pickup_point", "home", "business"] as const;
export type DeliveryKind = (typeof DELIVERY_KINDS)[number];

export const DELIVERY_KIND_LABELS: Record<DeliveryKind, string> = {
  pickup_point: "Pakkeshop",
  home: "Hjemmelevering",
  business: "Erhvervslevering",
};

export interface PickupPoint {
  readonly id: string;
  readonly carrierId: string;
  readonly name: string;
  readonly address1: string;
  readonly postalCode: string;
  readonly city: string;
  readonly countryCode: string;
  readonly distanceMeters: number | null;
  readonly openingHours: readonly string[];
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export interface ShippingOption {
  readonly id: string;
  readonly carrierId: string;
  readonly carrierName: string;
  readonly name: string;
  readonly kind: DeliveryKind;
  readonly price: Money;
  readonly estimatedDeliveryDays: number | null;
  readonly requiresPickupPoint: boolean;
  readonly logo: string | null;
}

export interface ShippingQuoteContext {
  readonly countryCode: string;
  readonly postalCode: string | null;
  readonly cartTotal: Money;
  readonly totalWeightG: number;
  readonly itemCount: number;
}

export interface PickupPointQuery {
  readonly countryCode: string;
  readonly postalCode: string;
  readonly address?: string | null;
  readonly limit?: number;
}

export interface ShipmentRequest {
  readonly orderId: string;
  readonly optionId: string;
  readonly address: Address;
  readonly pickupPointId: string | null;
  readonly weightG: number;
}

export interface Shipment {
  readonly id: string;
  readonly carrierId: string;
  readonly trackingNumber: string;
  readonly trackingUrl: string | null;
  readonly labelUrl: string | null;
}

export interface ShippingProviderInfo {
  readonly id: string;
  readonly name: string;
  readonly available: boolean;
  readonly isDevelopmentStub: boolean;
  readonly supportedKinds: readonly DeliveryKind[];
}

export interface ShippingProvider {
  readonly info: ShippingProviderInfo;
  quote(context: ShippingQuoteContext): Promise<readonly ShippingOption[]>;
  pickupPoints(query: PickupPointQuery): Promise<readonly PickupPoint[]>;
  createShipment(request: ShipmentRequest): Promise<Shipment>;
}
