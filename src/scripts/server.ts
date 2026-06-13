// ~ FILE-PATH: src/scripts/server.ts

import { Database } from "bun:sqlite";
import path from "path";

// Resolves relative to this specific script file
const dbPath = path.resolve(
  import.meta.dir,
  "./local-unicode-nameslist.sqlite",
);

const db = new Database(dbPath, { readonly: true });

Bun.serve({
  port: 4000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/glyphs") {
      const search = url.searchParams.get("search") || "";
      const start = parseInt(url.searchParams.get("start") || "32");
      const end = parseInt(url.searchParams.get("end") || "990000");
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      // Dynamic optimized indexed SQL query execution block
      const sql = `
        SELECT unicode_code, code_int, name 
        FROM unicode_chars 
        WHERE code_int BETWEEN ? AND ? 
          AND name LIKE ?
        ORDER BY code_int 
        LIMIT ? OFFSET ?
      `;

      const results = db
        .query(sql)
        .all(start, end, `%${search}%`, limit, offset);
      return Response.json(results);
    }

    return new Response("Not Found", { status: 404 });
  },
});
