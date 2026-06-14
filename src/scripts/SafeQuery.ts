// ~ FILE-PATH: src/scripts/Database.ts

// Custom database exception wrapper
export class DatabaseError extends Error {
  public readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);

    this.originalError = originalError;
    this.name = "DatabaseError";

    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Global safe execution wrapper
export default function SafeQuery<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("UNIQUE constraint failed")) {
        throw new DatabaseError("Duplicate entry detected.", error);
      }
      if (error.message.includes("FOREIGN KEY constraint failed")) {
        throw new DatabaseError(
          "Referenced relationship does not exist.",
          error,
        );
      }
      if (error.message.includes("no such table")) {
        throw new DatabaseError(
          "Database table does not exist. Please run migrations or create the table first.",
          error,
        );
      }
    }
    throw new DatabaseError("An unexpected database error occurred.", error);
  }
}
