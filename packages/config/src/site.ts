import { readList, readString } from "./env";
import { brand } from "./brand";

export interface SiteConfig {
  readonly url: string;
  readonly apiUrl: string;
  readonly adminUrl: string;
  readonly supportEmail: string;
  readonly supportPhone: string;
  readonly cvr: string;
  readonly address: {
    readonly street: string;
    readonly postalCode: string;
    readonly city: string;
    readonly country: string;
  };
  readonly social: readonly string[];
}

export function loadSiteConfig(): SiteConfig {
  return {
    url: readString("NEXT_PUBLIC_SITE_URL", "http://localhost:8000").replace(/\/$/, ""),
    apiUrl: readString("NEXT_PUBLIC_MEDUSA_BACKEND_URL", "http://localhost:9000").replace(/\/$/, ""),
    adminUrl: readString("NEXT_PUBLIC_ADMIN_URL", "http://localhost:9000/app").replace(/\/$/, ""),
    supportEmail: readString("NORDPRINT_SUPPORT_EMAIL", "hej@nordprint.dk"),
    supportPhone: readString("NORDPRINT_SUPPORT_PHONE", "+45 00 00 00 00"),
    cvr: readString("NORDPRINT_CVR", "00000000"),
    address: {
      street: readString("NORDPRINT_ADDRESS_STREET", "Printervej 1"),
      postalCode: readString("NORDPRINT_ADDRESS_POSTAL_CODE", "8000"),
      city: readString("NORDPRINT_ADDRESS_CITY", "Aarhus C"),
      country: readString("NORDPRINT_ADDRESS_COUNTRY", brand.country),
    },
    social: readList("NORDPRINT_SOCIAL_URLS", []),
  };
}

export const siteConfig: SiteConfig = loadSiteConfig();
