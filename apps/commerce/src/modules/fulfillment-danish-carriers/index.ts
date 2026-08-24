import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import DanishCarriersFulfillmentService from "./service";

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [DanishCarriersFulfillmentService],
});
