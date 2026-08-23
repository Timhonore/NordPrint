import { Module } from "@medusajs/framework/utils";
import FilamentModuleService from "./service";

export const FILAMENT_MODULE = "filament";

export default Module(FILAMENT_MODULE, {
  service: FilamentModuleService,
});

export { FilamentModuleService };
