// ~ FILE-PATH: tests/testDatabase.ts

import Database from "../src/utils/Database";
import ora from "ora";

interface User {
  id: number;
  username: string;
  email: string;
}

const DB_PATH = "testDatabase_app.db";

async function silentDelete(path: string): Promise<void> {
  try {
    await Bun.file(path).delete();
  } catch {
    // Silently ignore file access errors like:
    // "no such file or directory"
  }
}

async function cleanup(db: Database): Promise<void> {
  // Close database handle first to release file lock
  db.close();

  const spinner = new ora({
    spinner: "aesthetic",
    text: "Database connection cleanly closed.",
  }).start();

  // Safely delete the database files
  try {
    const dbFile = Bun.file(DB_PATH);
    await dbFile.delete();

    // Clean up SQLite auxiliary files
    await silentDelete(`${DB_PATH}-shm`);
    await silentDelete(`${DB_PATH}-wal`);

    spinner.succeed("Database cleanup complete!");
  } catch (cleanupError) {
    spinner.fail();
    console.warn("Warning: Cleanup failed:", cleanupError);
  }
}

async function runDatabaseTest(): Promise<void> {
  const spinner = new ora({
    spinner: "aesthetic",
    text: "Starting database integration tests...",
  }).start();

  // Instantiate using the generic wrapper class
  const userDb = new Database<User>(DB_PATH, "users");

  try {
    // Initialize the schema directly through your generic class
    userDb.initializeSchema(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );
    `);
    spinner.succeed("Schema initialized successfully!\n");

    // Perform a safe Insert Operation
    userDb.create({
      username: "dustin_dew",
      email: "dustin.r.dew.civ@army.mil",
    });
    console.log("Test record successfully created!", "\n");

    // Perform a Retrieve Operation
    const users = userDb.findAll();
    console.log("Current Records in Database:");
    console.table(users);
  } catch (error) {
    spinner.fail();
    console.error("Test failed:", error);
  } finally {
    await cleanup(userDb);
  }
}

await runDatabaseTest();
