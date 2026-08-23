import { Module } from "@medusajs/framework/utils";
import PrinterModuleService from "./service";

export const PRINTER_MODULE = "printer";

export default Module(PRINTER_MODULE, {
  service: PrinterModuleService,
});

export { PrinterModuleService };
