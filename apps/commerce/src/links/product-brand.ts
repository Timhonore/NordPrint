import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import BrandModule from "../modules/brand";

/**
 * Brand → products (one-to-many).
 *
 * The brand is the "one" side: many products share Bambu Lab, and a product
 * has exactly one brand. Declaring it the other way round would make the link
 * one-to-one and silently reject the second product of any brand.
 */
export default defineLink(BrandModule.linkable.brand, {
  linkable: ProductModule.linkable.product,
  isList: true,
});
