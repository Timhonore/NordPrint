import type { DeliveryKind, PickupPoint } from "@nordprint/types";

/**
 * Carrier registry.
 *
 * Each Danish carrier NordPrint plans to use is described as data here, and
 * gets its own `CarrierAdapter` implementation. Until credentials exist the
 * `development` adapter answers for all of them — clearly labelled, so nobody
 * mistakes a generated pickup point for a real one.
 */

export interface CarrierDefinition {
  readonly id: string;
  readonly name: string;
  readonly kinds: readonly DeliveryKind[];
  /** Env var that must hold the API key before the carrier goes live. */
  readonly credentialEnvKey: string;
  /** Base price in minor units, used until live rates are wired up. */
  readonly baseRates: Readonly<Record<DeliveryKind, number>>;
  readonly estimatedDeliveryDays: number;
  readonly trackingUrlTemplate: string;
  /** Grams. Parcels above this need a freight quote, not a parcel rate. */
  readonly maxWeightG: number;
}

export const CARRIERS: readonly CarrierDefinition[] = [
  {
    id: "gls",
    name: "GLS",
    kinds: ["pickup_point", "home", "business"],
    credentialEnvKey: "GLS_API_KEY",
    baseRates: { pickup_point: 3900, home: 5900, business: 6900 },
    estimatedDeliveryDays: 1,
    trackingUrlTemplate: "https://gls-group.eu/DK/da/find-pakke?match={tracking}",
    maxWeightG: 31_500,
  },
  {
    id: "dao",
    name: "DAO",
    kinds: ["pickup_point", "home"],
    credentialEnvKey: "DAO_API_KEY",
    baseRates: { pickup_point: 3500, home: 5500, business: 6500 },
    estimatedDeliveryDays: 1,
    trackingUrlTemplate: "https://www.dao.as/tracking/{tracking}",
    maxWeightG: 20_000,
  },
  {
    id: "postnord",
    name: "PostNord",
    kinds: ["pickup_point", "home", "business"],
    credentialEnvKey: "POSTNORD_API_KEY",
    baseRates: { pickup_point: 4200, home: 6400, business: 7400 },
    estimatedDeliveryDays: 2,
    trackingUrlTemplate: "https://www.postnord.dk/track-and-trace?shipmentId={tracking}",
    maxWeightG: 35_000,
  },
];

export const carrierById = (id: string): CarrierDefinition | undefined =>
  CARRIERS.find((carrier) => carrier.id === id);

/** True when this carrier has real credentials configured. */
export const carrierIsLive = (carrier: CarrierDefinition): boolean =>
  Boolean(process.env[carrier.credentialEnvKey]);

export interface CarrierAdapter {
  readonly carrier: CarrierDefinition;
  readonly isDevelopmentStub: boolean;
  pickupPoints(postalCode: string, limit: number): Promise<PickupPoint[]>;
  createShipment(input: {
    orderId: string;
    kind: DeliveryKind;
    weightG: number;
    pickupPointId: string | null;
  }): Promise<{ trackingNumber: string; trackingUrl: string; labelUrl: string | null }>;
}

/**
 * Development adapter.
 *
 * Returns deterministic, obviously-fake data so checkout can be developed and
 * tested end to end. Every value is prefixed or named so it cannot be confused
 * with a real pickup point or a real parcel number.
 */
export class DevelopmentCarrierAdapter implements CarrierAdapter {
  readonly isDevelopmentStub = true;

  constructor(readonly carrier: CarrierDefinition) {}

  async pickupPoints(postalCode: string, limit: number): Promise<PickupPoint[]> {
    const city = CITY_BY_POSTAL_PREFIX[postalCode.slice(0, 1)] ?? "Danmark";
    return Array.from({ length: Math.min(limit, 5) }, (_, index) => ({
      id: `${this.carrier.id}-dev-${postalCode}-${index + 1}`,
      carrierId: this.carrier.id,
      name: `[TEST] ${this.carrier.name} pakkeshop ${index + 1}`,
      address1: `Testvej ${index + 1}`,
      postalCode,
      city,
      countryCode: "dk",
      distanceMeters: (index + 1) * 350,
      openingHours: [
        "Man-fre: 07.00-20.00",
        "Lør: 08.00-18.00",
        "Søn: 10.00-16.00",
      ],
      latitude: null,
      longitude: null,
    }));
  }

  async createShipment(input: {
    orderId: string;
    kind: DeliveryKind;
    weightG: number;
    pickupPointId: string | null;
  }): Promise<{ trackingNumber: string; trackingUrl: string; labelUrl: string | null }> {
    const trackingNumber = `TEST-${this.carrier.id.toUpperCase()}-${input.orderId.slice(-8)}`;
    return {
      trackingNumber,
      trackingUrl: this.carrier.trackingUrlTemplate.replace("{tracking}", trackingNumber),
      // No label is produced without a carrier account — pretending otherwise
      // would leave warehouse staff waiting for a PDF that never arrives.
      labelUrl: null,
    };
  }
}

const CITY_BY_POSTAL_PREFIX: Record<string, string> = {
  "1": "København",
  "2": "København",
  "3": "Hillerød",
  "4": "Roskilde",
  "5": "Odense",
  "6": "Kolding",
  "7": "Herning",
  "8": "Aarhus",
  "9": "Aalborg",
};

/**
 * Resolves the adapter for a carrier. Real adapters are added here as each
 * carrier agreement is signed — nothing else in the system changes.
 */
export function resolveAdapter(carrier: CarrierDefinition): CarrierAdapter {
  // Real GLS/DAO/PostNord adapters plug in here once credentials exist.
  // Until then every carrier answers through the development adapter.
  return new DevelopmentCarrierAdapter(carrier);
}
