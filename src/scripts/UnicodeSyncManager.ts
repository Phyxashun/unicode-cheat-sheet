// ~ FILE-PATH: src/scripts/UnicodeSyncManager.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Database, Statement } from "bun:sqlite";
import ora from "ora";

export interface TableStatements {
  insertRange: Statement<any, any>;
  insertChar: Statement<any, any>;
}

export class UnicodeSyncManager {
  private readonly nameslistUrl: string;
  private readonly dbPath: string;
  private readonly chunkSize: number;
  private spinner: ReturnType<typeof ora>;

  constructor(dbPath: string, nameslistUrl: string, chunkSize?: number) {
    this.dbPath = dbPath;
    this.nameslistUrl = nameslistUrl;
    this.chunkSize = chunkSize ? chunkSize : 5000;

    this.spinner = ora({
      spinner: "aesthetic",
      text: "Connecting to official Unicode repository...",
    });
  }

  // Utility Methods

  private getFormattedDate(): string {
    const date = new Date();
    const yyyy = date.getFullYear().toString();
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  }

  private generateSerialNumber(): string {
    const timePart = Date.now().toString();
    const microPart = Math.floor((performance.now() % 1) * 10000)
      .toString()
      .padStart(4, "0");
    return `${timePart}${microPart}`;
  }

  private hexToInt(hexStr: string): number {
    return parseInt(hexStr.trim(), 16) || 0;
  }

  // Database Setup

  private createTable(db: Database): TableStatements {
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
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_char_int ON unicode_chars(code_int);`,
    );
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

  private cleanup(db: Database): void {
    try {
      db.run("VACUUM;");
      db.close();
    } catch (err) {
      throw err;
    }
  }

  // Core Routines

  private async getRemoteUpdateNeeded(): Promise<string | null> {
    this.spinner.text =
      "Checking for updates via partial byte range request...";
    try {
      //FIXME Added TLS bypass configuration to prevent certificate check errors on secure networks
      const partialResponse = await fetch(this.nameslistUrl, {
        headers: { Range: "bytes=0-1000" },
        tls: { rejectUnauthorized: false },
      });

      if (!partialResponse.ok && partialResponse.status !== 206) {
        this.spinner.fail("Network validation request failed.");
        throw new Error(
          `Failed partial fetch check: ${partialResponse.statusText}`,
        );
      }

      const headerChunk = await partialResponse.text();
      const dateMatch = headerChunk.match(
        /@\+\s*Generation Date:\s*([^\r\n]+)/,
      );

      if (!dateMatch) {
        this.spinner.warn(
          "Could not locate generation metadata. Running safe full update sync fallback.",
        );
        return "UNKNOWN_FALLBACK_STAMP";
      }

      const remoteGenDate = dateMatch[1].trim();
      this.spinner.text = `Remote File Version Timestamp: ${remoteGenDate}`;

      const db = new Database(this.dbPath, { create: true });
      db.run(
        "CREATE TABLE IF NOT EXISTS db_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
      );

      const localMeta = db
        .query("SELECT value FROM db_metadata WHERE key = 'generation_date'")
        .get() as { value: string } | null;

      if (localMeta && localMeta.value === remoteGenDate) {
        this.spinner.succeed(
          "Local SQLite database is already completely up to date. Skipping sync.",
        );
        db.close();
        return null;
      }

      this.spinner.info(
        "Local database is outdated or missing. Initializing download chain...",
      );
      db.close();
      return remoteGenDate;
    } catch (error) {
      this.spinner.fail("Error running network signature update checks.");
      throw error;
    }
  }

  private saveMetadataVersion(versionString: string): void {
    const db = new Database(this.dbPath);
    db.run(
      "INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('generation_date', ?);",
      [versionString],
    );
    db.close();
  }

  public async sync(): Promise<void> {
    this.spinner.start();
    try {
      const remoteVersion = await this.getRemoteUpdateNeeded();
      if (!remoteVersion) return;

      this.spinner.text = "Connecting to official Unicode repository...";
      const response = await fetch(this.nameslistUrl, {
        tls: { rejectUnauthorized: false },
      });

      if (!response.ok) {
        this.spinner.fail();
        throw new Error(
          `Failed to download NamesList.txt: ${response.statusText}`,
        );
      }

      this.spinner.text = "Writing backup file data cache...";
      const fileText = await response.text();
      const date = this.getFormattedDate();
      const serial = this.generateSerialNumber();
      await Bun.write(`./${date}_NamesList_${serial}.txt`, fileText);

      this.spinner.text = "Initializing optimized local SQLite database...";
      const db = new Database(this.dbPath, { create: true });
      const { insertRange, insertChar } = this.createTable(db);

      this.spinner.text =
        "Processing and parsing lines directly into SQLite...";
      let charCount = 0;
      let rangeCount = 0;
      const lines = fileText.split(/\r?\n/);

      for (let i = 0; i < lines.length; i += this.chunkSize) {
        const chunk = lines.slice(i, i + this.chunkSize);
        db.transaction(() => {
          for (const line of chunk) {
            if (!line || line.startsWith(";") || line.startsWith("@+"))
              continue;
            if (line.startsWith("@@")) {
              const parts = line.split("\t");
              if (parts.length >= 4) {
                insertRange.run({
                  $category: parts[2].trim(),
                  $start: parts[1].trim(),
                  $end: parts[3].trim(),
                  $start_int: this.hexToInt(parts[1]),
                  $end_int: this.hexToInt(parts[3]),
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
                $code_int: this.hexToInt(hexCode),
                $name: charName,
              });
              charCount++;
            }
          }
        })();

        this.spinner.text = `Processing... (${charCount.toLocaleString()} characters parsed)`;
        await Bun.sleep(0);
      }

      this.cleanup(db);
      this.saveMetadataVersion(remoteVersion);
      this.spinner.succeed(
        `Done! Loaded ${rangeCount} blocks and ${charCount.toLocaleString()} characters into ${this.dbPath}`,
      );
    } catch (error) {
      this.spinner.fail("\n❌ Critical Failure inside Sync Routine:");
      console.error(error);
    }
  }
}

// Configuration
const DP_PATH: string = "./local-unicode-nameslist.sqlite";
const URL: string = "https://www.unicode.org/Public/17.0.0/ucd/NamesList.txt";
const CHUNK_SIZE: number = 5000;

// Execution Trigger
const syncManager = new UnicodeSyncManager(DP_PATH, URL, CHUNK_SIZE);
syncManager.sync().catch(console.error);
