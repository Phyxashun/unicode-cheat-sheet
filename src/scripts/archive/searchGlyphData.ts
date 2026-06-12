// scripts/searchGlyphData.ts
import path from "path";

type GlyphDetail = {
  "Glyph Code": string;
  Category: string;
  Subcategory1: string;
  Subcategory2: string;
  Subcategory3: string;
  Name: string;
};
type GlyphData = Record<string, GlyphDetail>;

let glyphData: GlyphData | null = null;
const dataFilePath = path.join(import.meta.dir, "unicode-categories.json");

export async function loadGlyphData(): Promise<void> {
  if (glyphData) return;

  try {
    console.log(`Loading glyph data from: ${dataFilePath}`);
    const file = Bun.file(dataFilePath);
    glyphData = (await file.json()) as GlyphData;
    console.log("Glyph data loaded into memory.");
  } catch (error) {
    console.error(`❌ Failed to load or parse glyph data file: ${error}`);
    glyphData = null;
  }
}

export function getGlyphByCode(code: string): GlyphDetail | undefined {
  if (!glyphData) {
    console.warn(
      "⚠️ Warning: Glyph data has not been loaded. Please call `await loadGlyphData()` first.",
    );
    return undefined;
  }

  return glyphData[code];
}
