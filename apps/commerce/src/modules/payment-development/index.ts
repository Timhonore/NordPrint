import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import DevelopmentPaymentProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [DevelopmentPaymentProviderService],
});
