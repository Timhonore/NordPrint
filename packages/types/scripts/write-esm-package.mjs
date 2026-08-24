import { mkdir, writeFile } from "node:fs/promises";

/**
 * Marks dist/esm as ES modules.
 *
 * The package itself is `"type": "commonjs"` — that is what the Medusa server
 * loads. Without this file Node would read dist/esm/*.js as CommonJS too and
 * fail on the `export` statements.
 */
await mkdir(new URL("../dist/esm/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../dist/esm/package.json", import.meta.url),
  `${JSON.stringify({ type: "module" }, null, 2)}\n`
);
