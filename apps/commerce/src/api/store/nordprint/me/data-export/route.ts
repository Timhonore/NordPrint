import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { PRINTER_MODULE } from "../../../../../modules/printer";
import type PrinterModuleService from "../../../../../modules/printer/service";
import { WISHLIST_MODULE } from "../../../../../modules/wishlist";
import type WishlistModuleService from "../../../../../modules/wishlist/service";
import { REVIEW_MODULE } from "../../../../../modules/review";
import type ReviewModuleService from "../../../../../modules/review/service";

/**
 * GET /store/nordprint/me/data-export
 *
 * GDPR article 15 and 20: a copy of everything we hold on the customer, in a
 * machine-readable format.
 *
 * Assembled here rather than in the storefront because only the backend knows
 * every module that stores something about a customer. Adding a module that
 * holds personal data means adding it here — that is the point of keeping the
 * export in one place.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind for at hente dine data" });
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const customerService = req.scope.resolve(Modules.CUSTOMER);
  const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);
  const wishlistService = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE);
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE);

  const customer = await customerService.retrieveCustomer(customerId, {
    relations: ["addresses"],
  });

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "status",
      "currency_code",
      "email",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "shipping_address.*",
      "billing_address.*",
    ],
    filters: { customer_id: customerId },
  });

  const [printers, wishlist, reviews] = await Promise.all([
    printerService.listCustomerPrintersWithLineage(customerId),
    wishlistService.listWishlistItems({ customer_id: customerId }),
    reviewService.listProductReviews({ customer_id: customerId }),
  ]);

  // No Cache-Control beyond no-store: this is the most personal payload the
  // API produces, and it must not sit in a proxy or a browser cache.
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="nordprint-mine-data-${new Date().toISOString().slice(0, 10)}.json"`
  );

  res.json({
    exportedAt: new Date().toISOString(),
    format: "nordprint-data-export-v1",
    note: "Dette er alt, NordPrint har registreret om dig. Betalingsoplysninger indgår ikke — dem modtager vi aldrig.",
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      companyName: customer.company_name,
      createdAt: customer.created_at,
      addresses: customer.addresses ?? [],
    },
    orders,
    printers,
    wishlist,
    reviews,
  });
}
