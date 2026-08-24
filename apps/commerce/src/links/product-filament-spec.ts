import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import FilamentModule from "../modules/filament";

/**
 * Product ↔ filament specification (1:1).
 *
 * The link keeps filament data out of the core product table while still
 * letting a single Query call fetch product + spec, so the product page is one
 * round trip rather than two.
 */
export default defineLink(ProductModule.linkable.product, {
  linkable: FilamentModule.linkable.filamentSpec,
  isList: false,
});
