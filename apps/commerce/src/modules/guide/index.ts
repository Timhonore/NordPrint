import { Module } from "@medusajs/framework/utils";
import GuideModuleService from "./service";

export const GUIDE_MODULE = "guide";

export default Module(GUIDE_MODULE, {
  service: GuideModuleService,
});

export { GuideModuleService };
