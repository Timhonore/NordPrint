import type {
  ColorFamily,
  FilamentFinish,
  FilamentMaterial,
  FilamentSpec,
  FilamentVariantSpec,
} from "./filament";
import type { CompatibilityVerdict } from "./compatibility";

/** All money in the system is minor units (øre) + currency code. */
export interface Money {
  readonly amount: number;
  readonly currencyCode: string;
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "backorder";

export interface StockInfo {
  readonly status: StockStatus;
  readonly quantity: number | null;
  readonly manageInventory: boolean;
  readonly allowBackorder: boolean;
  readonly expectedRestockAt: string | null;
}

export interface ProductImage {
  readonly id: string;
  readonly url: string;
  readonly alt: string | null;
  readonly rank: number;
}

export interface Brand {
  readonly id: string;
  readonly name: string;
  readonly handle: string;
  readonly logoUrl: string | null;
  readonly description: string | null;
  readonly rank: number;
  readonly productCount?: number;
}

export interface ProductCategorySummary {
  readonly id: string;
  readonly name: string;
  readonly handle: string;
  readonly parentId: string | null;
}

export interface ProductVariantSummary {
  readonly id: string;
  readonly title: string;
  readonly sku: string | null;
  readonly ean: string | null;
  readonly price: Money | null;
  /** Førpris — only set when there is an active reduction. */
  readonly compareAtPrice: Money | null;
  readonly stock: StockInfo;
  readonly images: readonly ProductImage[];
  readonly active: boolean;
  readonly weightG: number | null;
  readonly filament: FilamentVariantSpec | null;
  /** Derived, never stored: price per kilogram of filament. */
  readonly pricePerKg: Money | null;
}

export type ProductKind =
  "filament" | "printer" | "spare_part" | "accessory" | "tool" | "resin" | "other";

export interface ProductSummary {
  readonly id: string;
  readonly handle: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly thumbnail: string | null;
  readonly kind: ProductKind;
  readonly brand: Brand | null;
  readonly categories: readonly ProductCategorySummary[];
  readonly priceFrom: Money | null;
  readonly compareAtPriceFrom: Money | null;
  readonly pricePerKgFrom: Money | null;
  readonly stock: StockStatus;
  readonly variantCount: number;
  /** Distinct colour swatches for the card, capped by the caller. */
  readonly swatches: readonly ColorSwatch[];
  readonly averageRating: number | null;
  readonly reviewCount: number;
  readonly isNew: boolean;
  readonly onSale: boolean;
  readonly material: FilamentMaterial | null;
  readonly finish: FilamentFinish | null;
}

export interface ColorSwatch {
  readonly variantId: string;
  readonly name: string;
  readonly hex: string | null;
  readonly hexSecondary: string | null;
  readonly family: ColorFamily | null;
  readonly stock: StockStatus;
}

export interface ProductDetail extends ProductSummary {
  readonly description: string | null;
  readonly images: readonly ProductImage[];
  readonly variants: readonly ProductVariantSummary[];
  readonly filament: FilamentSpec | null;
  readonly compatibility: CompatibilityVerdict | null;
  readonly relatedProductIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
