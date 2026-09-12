// harness/harness.html is the live shader view the candidate dialog embeds.
// Render deploys web/dist only, so the page has to be inside web/public to
// exist in production. Copied rather than committed: two copies of a file that
// renders shaders would drift, and the stale one would be the deployed one.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, "..", "..", "harness", "harness.html");
const to = join(here, "..", "public", "harness.html");

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log(`[copy-harness] ${from} -> ${to}`);
