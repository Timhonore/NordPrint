import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import ProcurementModule from "../modules/procurement";

/**
 * Variant ↔ internal cost price (1:1).
 *
 * Linked so admin queries can join it, never exposed through /store.
 */
export default defineLink(ProductModule.linkable.productVariant, {
  linkable: ProcurementModule.linkable.variantCost,
  isList: false,
});
