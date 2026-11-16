import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parse } from "./parse.js";

// The harness mounts the set at /input and expects /output/html.json; the
// local process driver instead passes the stand-in directories through
// MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR, so read those first.
const input = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const output = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const cases = JSON.parse(readFileSync(input + "/cases.json", "utf8"));
const out = new Array(cases.length);
for (let i = 0; i < cases.length; i++) {
  out[i] = parse(cases[i].markdown);
}
mkdirSync(output, { recursive: true });
writeFileSync(output + "/html.json", JSON.stringify(out));
