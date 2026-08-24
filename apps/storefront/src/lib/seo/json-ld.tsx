import { serializeJsonLd } from "./serialize-json-ld";

/**
 * Renders a schema.org block as JSON-LD.
 *
 * This is the only place in the storefront that writes raw HTML, and it never
 * writes anything but escaped JSON — see `serializeJsonLd`.
 */
export function JsonLd({ schema }: { readonly schema: unknown }): React.JSX.Element {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

export { serializeJsonLd };
