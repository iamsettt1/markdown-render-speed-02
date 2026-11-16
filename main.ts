import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parse } from "./parse.js";

const inputDir = (process.env.MAKEFUN_INPUT_DIR ?? "/input").replace(/\/+$/, "");
const outputDir = (process.env.MAKEFUN_OUTPUT_DIR ?? "/output").replace(/\/+$/, "");

const cases = JSON.parse(readFileSync(inputDir + "/cases.json", "utf8"));
const html = new Array(cases.length);
for (let i = 0; i < cases.length; i++) html[i] = parse(cases[i].markdown);

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputDir + "/html.json", JSON.stringify(html));
