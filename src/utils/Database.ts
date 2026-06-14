// ~ FILE-PATH: src/scripts/Database.ts

import { Database as SQLite } from "bun:sqlite";
import SafeQuery from "./SafeQuery";

class Database<T extends Record<string, any>> {
  private db: SQLite;
  private tableName: string;

  constructor(dbPath: string, tableName: string, schemaSql?: string) {
    this.db = new SQLite(dbPath, { create: true });
    this.tableName = tableName;

    // Enable WAL mode for high-concurrency performance
    this.db.run("PRAGMA journal_mode = WAL;");

    // Run the user-provided table schema setup
    if (schemaSql) this.initializeSchema(schemaSql);
  }

  /**
   * Run schema setup (e.g. CREATE TABLE statements) securely
   */
  public initializeSchema(schemaSql: string): void {
    SafeQuery(() => {
      this.db.run(schemaSql);
    });
  }

  /**
   * Generic Read By Column (e.g., id, code, or email)
   */
  public getByColumn(columnName: string, value: any): T | null {
    return this.db
      .query<
        T,
        [any]
      >(`SELECT * FROM ${this.tableName} WHERE ${columnName} = ?`)
      .get(value);
  }

  /**
   * Find a single record by its ID
   */
  public findById(id: T["id"]): T | null {
    return SafeQuery(() => {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`;
      return this.db.query(query).get(id) as T | null;
    });
  }

  /**
   * Generic Read All
   */
  public getAll(): T[] {
    return this.db.query<T, []>(`SELECT * FROM ${this.tableName}`).all();
  }

  /**
   * Find all records matching optional criteria
   */
  public findAll(): T[] {
    return SafeQuery(() => {
      const query = `SELECT * FROM ${this.tableName}`;
      return this.db.query(query).all() as T[];
    });
  }

  /**
   * Generic Create: Automatically maps object keys to SQL parameters
   */
  public add(item: T) {
    const keys = Object.keys(item);
    const columns = keys.join(", ");
    const placeholders = keys.map((k) => `$${k}`).join(", ");

    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

    // Construct the query parameters object (e.g., { $name: "Alice" })
    const params: Record<string, any> = {};
    for (const key of keys) {
      params[`$${key}`] = item[key];
    }

    return this.db.prepare(sql).run(params);
  }

  /**
   * Insert a new generic entity record
   */
  public create(entity: Omit<T, "id">): void {
    SafeQuery(() => {
      const keys = Object.keys(entity);
      const columns = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const values = Object.values(entity);

      const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
      this.db.run(query, values);
    });
  }

  /**
   * Update an existing generic entity
   */
  public update(id: T["id"], entity: Partial<Omit<T, "id">>): void {
    SafeQuery(() => {
      const keys = Object.keys(entity);
      if (keys.length === 0) return;

      const setClause = keys.map((key) => `${key} = ?`).join(", ");
      const values = [...Object.values(entity), id];

      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      this.db.run(query, values);
    });
  }

  /**
   * Delete a record by ID
   */
  public delete(id: T["id"]): void {
    SafeQuery(() => {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      this.db.run(query, id);
    });
  }

  /**
   * Close database connection safely
   */
  public close(): void {
    this.db.close();
  }
}

export default Database;
