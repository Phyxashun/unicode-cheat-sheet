// search_unicode.ts
import { Database } from "bun:sqlite";

// Standardized to match sync script destination extension
const DB_PATH = "./local-unicode-nameslist.sqlite";

/**
 * Utility to safe-convert hex code strings into live visual glyphs
 */
function toGlyph(hexStr: string): string {
  try {
    const codePoint = parseInt(hexStr, 16);
    // Return the literal character representation
    return String.fromCodePoint(codePoint);
  } catch {
    return "❓";
  }
}

/**
 * 1. Searches for characters by a partial or full name match.
 */
function searchByName(db: Database, nameQuery: string) {
  const query = db.query(
    "SELECT unicode_code, name FROM unicode_chars WHERE name LIKE ? ORDER BY code_int",
  );

  const results = query.all(`%${nameQuery}%`) as {
    unicode_code: string;
    name: string;
  }[];

  if (results.length > 0) {
    console.log(
      `\n✅ Found ${results.length.toLocaleString()} character(s) matching '${nameQuery}':`,
    );
    for (const char of results) {
      const glyph = toGlyph(char.unicode_code);
      console.log(`  ${glyph} - U+${char.unicode_code}: ${char.name}`);
    }
  } else {
    console.log(`\n❌ No characters found matching '${nameQuery}'.`);
  }
}

/**
 * 2. Searches for a single character by its exact Unicode hex code.
 */
function searchByCode(db: Database, codeQuery: string) {
  const query = db.query(
    "SELECT unicode_code, name FROM unicode_chars WHERE unicode_code = ?",
  );

  const cleanCode = codeQuery.toUpperCase().replace(/^U\+/, "").trim();
  const result = query.get(cleanCode) as {
    unicode_code: string;
    name: string;
  } | null;

  if (result) {
    console.log("\n✅ Found character:");
    const glyph = toGlyph(result.unicode_code);
    console.log(`  ${glyph} - U+${result.unicode_code}: ${result.name}`);
  } else {
    console.log(`\n❌ No character found with code '${cleanCode}'.`);
  }
}

/**
 * 3. Thoroughly searches ALL matching blocks/categories.
 */
function searchByCategory(db: Database, categoryQuery: string) {
  const rangeQuery = db.query(
    "SELECT start_int, end_int, unicode_category FROM unicode_ranges WHERE unicode_category LIKE ?",
  );

  const ranges = rangeQuery.all(`%${categoryQuery}%`) as {
    start_int: number;
    end_int: number;
    unicode_category: string;
  }[];

  if (ranges.length === 0) {
    console.log(
      `\n❌ No blocks found matching category search: '${categoryQuery}'.`,
    );
    return;
  }

  const charQuery = db.query(
    "SELECT unicode_code, name FROM unicode_chars WHERE code_int BETWEEN ? AND ? ORDER BY code_int",
  );

  for (const range of ranges) {
    const charResults = charQuery.all(range.start_int, range.end_int) as {
      unicode_code: string;
      name: string;
    }[];

    console.log(
      `\n📦 Block: ${range.unicode_category} (${charResults.length} characters)`,
    );
    if (charResults.length > 0) {
      for (const char of charResults) {
        const glyph = toGlyph(char.unicode_code);
        console.log(`  ${glyph} - U+${char.unicode_code}: ${char.name}`);
      }
    } else {
      console.log(
        "  (No direct character definitions saved for this block index)",
      );
    }
  }
}

/**
 * 4. Tests the database thoroughly using random records and queries
 */
function runThoroughRandomTest(db: Database) {
  console.log("\n🎲 --- RUNNING AUTOMATED DATABASE STRESS TEST ---");

  const countChars = db
    .query("SELECT COUNT(*) as cnt FROM unicode_chars")
    .get() as { cnt: number };
  const countRanges = db
    .query("SELECT COUNT(*) as cnt FROM unicode_ranges")
    .get() as { cnt: number };

  console.log(
    `📊 Current DB Stats: ${countChars.cnt.toLocaleString()} characters, ${countRanges.cnt} block ranges loaded.`,
  );

  if (countChars.cnt === 0 || countRanges.cnt === 0) {
    console.log(
      "❌ Test failed: Tables are empty. Please run sync-unicode first.",
    );
    return;
  }

  const randomChar = db
    .query(
      "SELECT unicode_code, name FROM unicode_chars ORDER BY RANDOM() LIMIT 1",
    )
    .get() as { unicode_code: string; name: string };

  console.log("\n🧪 Test 1: Querying a random character code...");
  searchByCode(db, randomChar.unicode_code);

  console.log("\n🧪 Test 2: Querying by a random character's name...");
  const nameSnippet = randomChar.name.split(" ")[0] || randomChar.name;
  searchByName(db, nameSnippet);

  const randomRange = db
    .query(
      "SELECT unicode_category FROM unicode_ranges ORDER BY RANDOM() LIMIT 1",
    )
    .get() as { unicode_category: string };

  console.log("\n🧪 Test 3: Querying a random structural Unicode Block...");
  searchByCategory(db, randomRange.unicode_category);

  console.log("\n✨ Automated structural database testing complete!");
}

function printHelp() {
  console.log(`
Unicode Database Search & Testing Tool (Bun/TypeScript)
-------------------------------------------------------
Usage: bun scripts/search_unicode.ts [flag] "[query]"

Flags:
  -n, --name       Search for characters by partial/full name.
  -c, --code       Search for a character by exact Hex code.
  -cat, --category Search for all characters in matching category blocks.
  -t, --test       Run automated database integrity/random testing.

Examples:
  bun scripts/search_unicode.ts --name "DELTA"
  bun scripts/search_unicode.ts --code "0394"
  bun scripts/search_unicode.ts --category "Latin"
  bun scripts/search_unicode.ts --test
  `);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    printHelp();
    return;
  }

  const flag = args[0];
  const value = args[1] || "";
  let db: Database;

  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch (err) {
    console.error(`\n❌ Error: Database file not found at '${DB_PATH}'.`);
    console.error(
      "Please run your migration sync script first to compile the data.",
    );
    return;
  }

  switch (flag) {
    case "-n":
    case "--name":
      if (!value) {
        console.log("Error: Search query required");
        break;
      }
      searchByName(db, value);
      break;
    case "-c":
    case "--code":
      if (!value) {
        console.log("Error: Code required");
        break;
      }
      searchByCode(db, value);
      break;
    case "-cat":
    case "--category":
      if (!value) {
        console.log("Error: Category name required");
        break;
      }
      searchByCategory(db, value);
      break;
    case "-t":
    case "--test":
      runThoroughRandomTest(db);
      break;
    default:
      console.error(`Unknown flag: ${flag}`);
      printHelp();
  }

  db.close();
}

main();
