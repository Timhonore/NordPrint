import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../serialize-json-ld";

describe("serializeJsonLd", () => {
  it("lukker ikke script-tagget, når data indeholder </script>", () => {
    const output = serializeJsonLd({
      name: `PLA </${"script"}><img src=x onerror=alert(1)>`,
    });

    expect(output).not.toContain(`</${"script"}>`);
    expect(output).not.toContain("<img");
    expect(output).toContain("\\u003c");
  });

  it("bevarer værdien — escaping må ikke ændre indholdet", () => {
    const schema = { name: "PLA <Basic> & mere", price: 18900 };

    expect(JSON.parse(serializeJsonLd(schema))).toEqual(schema);
  });

  it("escaper linjeadskillere, der er gyldige i JSON men ikke i JavaScript", () => {
    const output = serializeJsonLd({ a: "x\u2028y", b: "x\u2029y" });

    expect(output).not.toContain("\u2028");
    expect(output).not.toContain("\u2029");
    expect(JSON.parse(output)).toEqual({ a: "x\u2028y", b: "x\u2029y" });
  });
});
