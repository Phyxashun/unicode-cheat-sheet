// ~ FILE-PATH: src/scripts/sync-unicode.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Database, Statement } from "bun:sqlite";
import ora from "ora";

const NAMESLIST_URL = "https://www.unicode.org/Public/17.0.0/ucd/NamesList.txt";
const DB_PATH = "./local-unicode-nameslist.sqlite";
const CHUNK_SIZE = 5000;

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

  db.run(`
    CREATE TABLE IF NOT EXISTS db_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
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

export function cleanup(db: Database): void {
  try {
    db.run("VACUUM;");
    db.close();
  } catch (err) {
    throw err;
  }
}

async function getRemoteUpdateNeeded(): Promise<string | null> {
  const spinner = ora(
    "🔍 Checking for updates via partial byte range request...",
  ).start();

  try {
    const partialResponse = await fetch(NAMESLIST_URL, {
      headers: { Range: "bytes=0-1000" },
    });

    if (!partialResponse.ok && partialResponse.status !== 206) {
      spinner.fail("Network validation request failed.");
      throw new Error(
        `Failed partial fetch check: ${partialResponse.statusText}`,
      );
    }

    const headerChunk = await partialResponse.text();
    const dateMatch = headerChunk.match(/@\+\s*Generation Date:\s*([^\r\n]+)/);

    if (!dateMatch) {
      spinner.warn(
        "Could not locate generation metadata. Running safe full update sync fallback.",
      );
      return "UNKNOWN_FALLBACK_STAMP";
    }

    const remoteGenDate = dateMatch[1].trim();
    spinner.text = `🌐 Remote File Version Timestamp: ${remoteGenDate}`;

    const db = new Database(DB_PATH, { create: true });
    db.run(
      "CREATE TABLE IF NOT EXISTS db_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
    );

    const localMeta = db
      .query("SELECT value FROM db_metadata WHERE key = 'generation_date'")
      .get() as { value: string } | null;

    if (localMeta && localMeta.value === remoteGenDate) {
      spinner.succeed(
        "Local SQLite database is already completely up to date. Skipping sync.",
      );
      db.close();
      return null;
    }

    spinner.info(
      "Local database is outdated or missing. Initializing download chain...",
    );
    db.close();
    return remoteGenDate;
  } catch (error) {
    spinner.fail("Error running network signature update checks.");
    throw error;
  }
}

function saveMetadataVersion(versionString: string): void {
  const db = new Database(DB_PATH);
  db.run(
    "INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('generation_date', ?);",
    [versionString],
  );
  db.close();
}

async function fetchAndBuildUnicodeDb() {
  try {
    // Await the async update evaluation call properly
    const remoteVersion = await getRemoteUpdateNeeded();
    if (!remoteVersion) return; // Database is already current

    const spinner = ora(
      "📥 Connecting to official Unicode repository...",
    ).start();

    const response = await fetch(NAMESLIST_URL, {
      tls: { rejectUnauthorized: false },
    });

    if (!response.ok) {
      spinner.fail();
      throw new Error(
        `Failed to download NamesList.txt: ${response.statusText}`,
      );
    }

    spinner.text = "💾 Writing backup file data cache...";
    const fileText = await response.text();
    const date = getFormattedDate();
    const serial = generateSerialNumber();
    await Bun.write(`./${date}_NamesList_${serial}.txt`, fileText);

    spinner.text = "🗄️ Initializing optimized local SQLite database...";
    const db = new Database(DB_PATH, { create: true });
    const { insertRange, insertChar } = createTable(db);

    spinner.text = "⚡ Processing and parsing lines directly into SQLite...";
    let charCount = 0;
    let rangeCount = 0;
    const lines = fileText.split(/\r?\n/);

    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);

      // Wrap ONLY this small chunk inside a high-speed transaction
      db.transaction(() => {
        for (const line of chunk) {
          if (!line || line.startsWith(";") || line.startsWith("@+")) continue;

          if (line.startsWith("@@")) {
            const parts = line.split("\t");
            if (parts.length >= 4) {
              insertRange.run({
                $category: parts[2].trim(),
                $start: parts[1].trim(),
                $end: parts[3].trim(),
                $start_int: hexToInt(parts[1]),
                $end_int: hexToInt(parts[3]),
              });
              rangeCount++;
            }
            continue;
          }

          if (/^[0-9A-F]{4,6}\t/.test(line)) {
            const firstTabIndex = line.indexOf("\t");
            const hexCode = line.substring(0, firstTabIndex);
            const charName = line.substring(firstTabIndex + 1).trim();

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
      })();

      spinner.text = `⚡ Processing... (${charCount.toLocaleString()} characters parsed)`;
      await Bun.sleep(0);
    }

    cleanup(db);

    // Pass version variable here safely across scopes
    saveMetadataVersion(remoteVersion);

    spinner.succeed(
      `🚀 Done! Loaded ${rangeCount} blocks and ${charCount.toLocaleString()} characters into ${DB_PATH}`,
    );
  } catch (error) {
    spinner.fail("\n❌ Critical Failure inside Sync Routine:");
    console.error(error);
  }
}

fetchAndBuildUnicodeDb().catch(console.error);
