import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import ResendNotificationProviderService from "./service";

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendNotificationProviderService],
});

export { EMAIL_TEMPLATES, renderEmail } from "./templates";
export type { EmailData, EmailTemplate, RenderedEmail } from "./templates";
