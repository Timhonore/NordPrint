/**
 * Serializes a schema.org object for embedding in a `<script>` tag.
 *
 * `JSON.stringify` does not escape `<`, so a product title or guide heading
 * containing `</script>` would close the tag and let the rest of the string be
 * parsed as markup. Product data is entered in the admin, which makes that a
 * real path rather than a theoretical one — so every `<` becomes `\\u003c`,
 * which JSON parses back to the same character.
 *
 * U+2028 and U+2029 are escaped too: they are valid inside a JSON string but
 * terminate a line in JavaScript.
 */
export function serializeJsonLd(schema: unknown): string {
  return JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
