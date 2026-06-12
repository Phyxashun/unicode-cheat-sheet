/* eslint-disable @typescript-eslint/no-explicit-any */
import { Database, Statement } from "bun:sqlite";

const NAMESLIST_URL = "https://www.unicode.org/Public/17.0.0/ucd/NamesList.txt";
const DB_PATH = "./local-unicode-nameslist.sqlite";

export interface TableStatements {
  insertRange: Statement<any, any>;
  insertChar: Statement<any, any>;
}

export function getFormattedDate(): string {
  const date = new Date();
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export function generateSerialNumber(): string {
  const timePart = Date.now().toString();
  const microPart = Math.floor((performance.now() % 1) * 10000)
    .toString()
    .padStart(4, "0");
  return `${timePart}${microPart}`;
}

export function hexToInt(hexStr: string): number {
  return parseInt(hexStr.trim(), 16) || 0;
}

export function createTable(db: Database): TableStatements {
  db.run(`
    CREATE TABLE IF NOT EXISTS unicode_ranges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unicode_category TEXT NOT NULL,
      start_code TEXT NOT NULL,
      end_code TEXT NOT NULL,
      start_int INTEGER NOT NULL,
      end_int INTEGER NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS unicode_chars (
      unicode_code TEXT PRIMARY KEY,
      code_int INTEGER NOT NULL,
      name TEXT NOT NULL
    );
  `);

  db.run("DELETE FROM unicode_ranges;");
  db.run("DELETE FROM unicode_chars;");

  db.run(
    `CREATE INDEX IF NOT EXISTS idx_range_bounds ON unicode_ranges(start_int, end_int);`,
  );
  db.run(`CREATE INDEX IF NOT EXISTS idx_char_int ON unicode_chars(code_int);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_char_name ON unicode_chars(name);`);

  const insertRange = db.prepare(`
    INSERT INTO unicode_ranges (unicode_category, start_code, end_code, start_int, end_int)
    VALUES ($category, $start, $end, $start_int, $end_int);
  `);

  const insertChar = db.prepare(`
    INSERT OR REPLACE INTO unicode_chars (unicode_code, code_int, name)
    VALUES ($code, $code_int, $name);
  `);

  return { insertRange, insertChar };
}

async function fetchAndBuildUnicodeDb() {
  console.log("📥 Connecting to official Unicode repository...");

  const response = await fetch(NAMESLIST_URL, {
    tls: { rejectUnauthorized: false },
  });

  if (!response.ok) {
    throw new Error(`Failed to download NamesList.txt: ${response.statusText}`);
  }

  const fileText = await response.text();
  const date = getFormattedDate();
  const serial = generateSerialNumber();
  await Bun.write(`./${date}_NamesList_${serial}.txt`, fileText);
  console.log(`💾 Backup text file saved safely.`);

  console.log("🗄️ Initializing optimized local SQLite database...");
  const db = new Database(DB_PATH, { create: true });
  const { insertRange, insertChar } = createTable(db);

  console.log("⚡ Processing and parsing lines directly into SQLite...");
  let charCount = 0;
  let rangeCount = 0;
  const lines = fileText.split(/\r?\n/);

  const transactionWrapper = db.transaction(() => {
    for (const line of lines) {
      // Fast bypass for empty lines, file comments, or notices
      if (!line || line.startsWith(";") || line.startsWith("@+")) continue;

      // CASE A: Block Range Header Line (Starts with @@)
      if (line.startsWith("@@")) {
        const parts = line.split("\t");
        // Format: @@ <tab> BLOCKSTART <tab> BLOCKNAME <tab> BLOCKEND
        if (parts.length >= 4) {
          const startHex = parts[1].trim();
          const category = parts[2].trim();
          const endHex = parts[3].trim();

          insertRange.run({
            $category: category,
            $start: startHex,
            $end: endHex,
            $start_int: hexToInt(startHex),
            $end_int: hexToInt(endHex),
          });
          rangeCount++;
        }
        continue;
      }

      // CASE B: Character Definition Row (Validates uppercase hex followed by a tab)
      if (/^[0-9A-F]{4,6}\t/.test(line)) {
        const firstTabIndex = line.indexOf("\t");
        const hexCode = line.substring(0, firstTabIndex);
        const charName = line.substring(firstTabIndex + 1).trim();

        // Skip variants, annotations, expansions, and reserved entries
        if (
          charName.startsWith("<reserved>") ||
          charName.startsWith("=") ||
          charName.startsWith("*") ||
          charName.startsWith("x") ||
          charName.startsWith(":") ||
          charName.startsWith("#")
        ) {
          continue;
        }

        insertChar.run({
          $code: hexCode,
          $code_int: hexToInt(hexCode),
          $name: charName,
        });
        charCount++;
      }
    }
  });

  transactionWrapper();

  // Clean and optimize database size
  db.run("VACUUM;");
  db.close();

  console.log("\n🚀 Done!");
  console.log(`🔹 Imported ${rangeCount} Unicode block ranges.`);
  console.log(
    `🔹 Imported ${charCount.toLocaleString()} indexed character mappings.`,
  );
  console.log(`📁 Database file ready at: ${DB_PATH}`);
}

fetchAndBuildUnicodeDb().catch(console.error);
