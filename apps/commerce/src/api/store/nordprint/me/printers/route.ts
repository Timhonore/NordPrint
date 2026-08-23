import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { PRINTER_MODULE } from "../../../../../modules/printer";
import type PrinterModuleService from "../../../../../modules/printer/service";

/**
 * "Mine printere" on the customer account.
 *
 * Guests keep their choice in local storage; a logged-in customer's printers
 * live here so the compatibility badge follows them across devices.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind for at se dine printere" });
    return;
  }

  const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);
  res.json({ printers: await printerService.listCustomerPrintersWithLineage(customerId) });
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind for at gemme din printer" });
    return;
  }

  const body = (req.body ?? {}) as {
    printerModelId?: string;
    nickname?: string | null;
    makePrimary?: boolean;
    /** Guest printers to merge in at login. */
    merge?: string[];
  };

  const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);

  if (Array.isArray(body.merge) && body.merge.length > 0) {
    await printerService.mergeGuestPrinters(customerId, body.merge.slice(0, 20));
  }

  if (body.printerModelId) {
    const model = await printerService.retrieveModelWithLineage(body.printerModelId);
    if (!model) {
      res.status(404).json({ message: "Printeren findes ikke" });
      return;
    }
    await printerService.saveCustomerPrinter({
      customerId,
      printerModelId: body.printerModelId,
      nickname: body.nickname ?? null,
      makePrimary: body.makePrimary ?? true,
    });
  }

  res.json({ printers: await printerService.listCustomerPrintersWithLineage(customerId) });
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind først" });
    return;
  }

  const id = typeof req.query.id === "string" ? req.query.id : null;
  if (!id) {
    res.status(400).json({ message: "id mangler" });
    return;
  }

  const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);

  // Scope the delete to the session's own customer — never trust an id alone.
  const owned = await printerService.listCustomerPrinters({ id, customer_id: customerId });
  if (owned.length === 0) {
    res.status(404).json({ message: "Printeren findes ikke på din konto" });
    return;
  }

  await printerService.deleteCustomerPrinters([id]);
  res.status(204).send("");
}
