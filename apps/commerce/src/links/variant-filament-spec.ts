import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import FilamentModule from "../modules/filament";

/** Product variant ↔ colour/SKU-level filament data (1:1). */
export default defineLink(ProductModule.linkable.productVariant, {
  linkable: FilamentModule.linkable.filamentVariantSpec,
  isList: false,
});
