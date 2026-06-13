// ~ FILE-PATH: src/scripts/archive/runConversion.ts

import { csvToJson } from "./csvToJson";
import path from "path";

async function convert(input: string, output: string, key: string) {
  const fileDelimiter = ",";
  const scriptDir = import.meta.dir;

  const inputFile = path.join(scriptDir, input);
  const outputFile = path.join(scriptDir, output);

  console.log(`Searching for input file: ${input}`);
  await csvToJson(inputFile, outputFile, fileDelimiter, key);
}

await convert("categories.csv", "unicode-categories.json", "Unicode Code");
await convert("names.csv", "unicode-names.json", "Name");
