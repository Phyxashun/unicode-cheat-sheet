// ~ FILE-PATH: src/scripts/server.ts

import { Database } from "bun:sqlite";
import type { type Server } from "bun";
import Settings from "../Settings";
import { intro, spinner, note, outro, cancel } from "@clack/prompts";
import pc from "picocolors";
import path from "path";

interface DatabaseInfo {
  file: string;
  name: string;
  path: string;
  shortPath: string;
}

const { version, name } = Settings.getInstance().App;
const APP_VERSION = version;
const DEFAULT_DB = "./local-unicode-nameslist.sqlite";

// Robust check for Unicode/UTF-8 capability
const supportsUnicode =
  process.platform === "win32"
    ? process.env.WT_SESSION ||
      process.env.TERMINAL_EMULATOR === "JetBrains-JediTerm"
    : process.env.TERM !== "linux" && !process.env.CI;

const BRANDING = supportsUnicode
  ? pc.white(pc.inverse(`🌐 [𝕌+]`))
  : pc.white(pc.inverse(`[U+]`));

export class UnicodeServer {
  private db!: Database;
  private server?: Server;
  private port: number;

  constructor(port = 4000) {
    this.port = port;
  }

  /**
   * Initializes the database, starts the API server, and registers input listeners.
   */
  public async start(): Promise<void> {
    // Render a clean header block
    intro(
      pc.magenta(
        pc.bold(`${BRANDING} CHEATSHEET v${APP_VERSION} SERVER CONTROL `),
      ),
    );

    const {
      file: dbFile,
      name: dbName,
      path: dbPath,
      shortPath: dbDir,
    }: DatabaseInfo = this.getDatabaseInfo();

    const styledName = pc.yellow(dbName);
    const styledPath = pc.green(dbDir);

    const s = spinner();
    s.start("Connecting to database...");

    try {
      this.db = new Database(dbPath, { readonly: true });
      s.stop(`Database successfully loaded [${styledName}]`);
    } catch (error) {
      s.stop("Failed to load database", 1);
      throw error;
    }

    // Start the Bun server
    this.server = Bun.serve({
      port: this.port,
      fetch: (req) => this.handleRequest(req),
    });

    // Print an elegant structured block for the running server details
    note(
      `Local Network: ${pc.cyan(pc.bold(pc.underline(`${this.server.url}`)))}\n\n` +
        `Database Path: ${styledPath}\n` +
        `Database File: ${styledName}`,
      "Server Status",
    );

    // Separated the keyboard stop listener visual to form the bottom boundary
    note(
      `Press ${pc.yellow(pc.bold("'q'"))} or ${pc.red(pc.bold("Ctrl+C"))} to safely halt the active instance.`,
      "Stop Database",
    );

    this.setupKeyboardListener();
  }

  /**
   * Gracefully shuts down the database connection and the HTTP server.
   */
  public stop(): void {
    // Upgraded standard console to clean final visual execution frame
    outro(pc.yellow(`ℹ️ Safely shutting down ${BRANDING} database server.`));

    if (this.db) {
      this.db.close();
    }
    if (this.server) {
      this.server.stop();
    }
    process.exit(0);
  }

  /**
   * Parses and resolves the database path from command-line arguments.
   */
  private getDatabaseInfo(): DatabaseInfo {
    const passedPath = Bun.argv[2] || DEFAULT_DB;

    if (!passedPath) {
      cancel("Error: Please provide a valid path to the SQLite file target.");
      console.log(pc.dim("  Usage: bun src/scripts/server.ts <path-to-db>\n"));
      process.exit(1);
    }

    const dbPath = Bun.resolveSync(passedPath, import.meta.dir);
    const relPath = path.relative(process.cwd(), dbPath) || dbPath;
    const dbFile = Bun.file(relPath);

    if (!dbFile.exists()) {
      cancel(`Error: Could not locate database file.`);
      console.log(pc.red(`  Absolute Path: ${dbPath}`));
      console.log(pc.red(`  Resolved Path: ${relPath}`));
      console.log(
        pc.dim("  Please verify your path or default configuration.\n"),
      );
      process.exit(1);
    }

    const dbName = path.basename(relPath);
    const dbDir = relPath.substring(0, relPath.length - dbName.length);

    const result = {
      file: dbFile,
      name: dbName,
      path: dbPath,
      shortPath: dbDir,
    };
    return result;
  }

  /**
   * Core routing logic for incoming HTTP requests.
   */
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/api/glyphs") {
      return this.fetchGlyphs(url.searchParams);
    }
    return new Response("Not Found", { status: 404 });
  }

  /**
   * Executes the database query based on the URL query parameters.
   */
  private fetchGlyphs(params: URLSearchParams): Response {
    const search = params.get("search") || "";
    const start = parseInt(params.get("start") || "32");
    const end = parseInt(params.get("end") || "990000");
    const limit = parseInt(params.get("limit") || "100");
    const offset = parseInt(params.get("offset") || "0");

    const sql = `
      SELECT unicode_code, code_int, name 
      FROM unicode_chars 
      WHERE code_int BETWEEN ? AND ? 
        AND name LIKE ? 
      ORDER BY code_int 
      LIMIT ? OFFSET ?
    `;

    const results = this.db
      .query(sql)
      .all(start, end, `%${search}%`, limit, offset);

    return Response.json(results);
  }

  /**
   * Sets up stdin stream tracking to catch the 'q' termination signal.
   */
  private setupKeyboardListener(): void {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (key: string) => {
      if (key === "q" || key === "\u0003") {
        this.stop();
      }
    });
  }
}

// Instantiate and boot up the database server
const dbServer = new UnicodeServer(4000);
dbServer.start();
