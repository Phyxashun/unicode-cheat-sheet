// scripts/runSearch.ts
import { loadGlyphData, getGlyphByCode } from "./searchGlyphData";

async function main() {
  // 1. Load the data into memory. This only happens once.
  await loadGlyphData();

  console.log("\n--- Running Searches ---");

  // 2. Now you can perform fast, synchronous searches.

  // Example 1: Search for a code that exists
  const codeToFind = "0020";
  const glyph1 = getGlyphByCode(codeToFind);
  if (glyph1) {
    console.log(`✅ Found glyph for code "${codeToFind}":`, glyph1, "\n");
  } else {
    console.log(`❌ Glyph for code "${codeToFind}" not found.\n`);
  }

  // Example 2: Search for another code
  const codeToFind2 = "F1A0"; // A Nerd Font icon
  const glyph2 = getGlyphByCode(codeToFind2.toUpperCase()); // Ensure consistent casing
  if (glyph2) {
    console.log(`✅ Found glyph for code "${codeToFind2}":`, glyph2, "\n");
  } else {
    console.log(`❌ Glyph for code "${codeToFind2}" not found.\n`);
  }

  // Example 3: Search for a code that does NOT exist
  const nonExistentCode = "XXXX";
  const glyph3 = getGlyphByCode(nonExistentCode);
  if (glyph3) {
    console.log(`✅ Found glyph for code "${nonExistentCode}":`, glyph3, "\n");
  } else {
    console.log(`❌ Glyph for code "${nonExistentCode}" not found.\n`);
  }
}

main();
