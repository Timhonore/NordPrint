import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * POST /store/nordprint/me/deletion-request
 *
 * GDPR article 17. Deliberately a *request*, not an immediate delete.
 *
 * Danish bookkeeping law requires invoices to be kept for five years, so an
 * account cannot simply be erased the moment it is asked for — the order
 * history has to be anonymised instead, and that is a judgement call a person
 * makes. Recording the request, notifying the shop and telling the customer
 * what happens next is the honest version.
 *
 * The request is recorded on the customer's own record, so it survives a
 * restart and cannot be lost in a queue nobody watches.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind for at anmode om sletning" });
    return;
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const customerService = req.scope.resolve(Modules.CUSTOMER);

  const customer = await customerService.retrieveCustomer(customerId);
  const existing = (customer.metadata ?? {}) as Record<string, unknown>;

  // An already-registered request is not an error: asking twice is a
  // reasonable thing for a worried customer to do.
  const requestedAt =
    typeof existing["deletionRequestedAt"] === "string"
      ? existing["deletionRequestedAt"]
      : new Date().toISOString();

  await customerService.updateCustomers(customerId, {
    metadata: { ...existing, deletionRequestedAt: requestedAt },
  });

  // No e-mail address in the log line — the id is enough to act on it.
  logger.info(`GDPR: sletteanmodning registreret for kunde ${customerId}`);

  res.setHeader("Cache-Control", "no-store, private");
  res.json({
    requestedAt,
    message:
      "Vi har registreret din anmodning og vender tilbage inden for en måned. Fakturaer beholder vi i fem år, som bogføringsloven kræver — de bliver anonymiseret.",
  });
}
