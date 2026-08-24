import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import PrinterModule from "../modules/printer";

/**
 * Product ↔ printer model, for products that *are* a printer.
 *
 * This is deliberately separate from the compatibility rules: a P1S product
 * page links to the P1S model so we can show its specs, while compatibility
 * describes which *other* products fit it.
 */
export default defineLink(ProductModule.linkable.product, {
  linkable: PrinterModule.linkable.printerModel,
  isList: false,
});
