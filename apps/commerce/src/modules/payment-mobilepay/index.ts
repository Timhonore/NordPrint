import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import MobilePayProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [MobilePayProviderService],
});
