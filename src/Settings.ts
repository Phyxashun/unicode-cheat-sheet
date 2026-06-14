// ~ FILE-PATH: src/Settings.ts

// Fix 1: Updated 'assert' to modern standard 'with' for JSON imports
import pkg from "../package.json" with { type: "json" };

export interface AppConfig {
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly email: string;
  readonly license: string;
  readonly apiKey: string;
}

export default class Settings {
  private static readonly instance: Settings = new Settings();
  public readonly App: AppConfig;

  private constructor() {
    // 1. Detect if code is running in a Vite-managed browser environment
    const isViteFrontend =
      typeof import.meta !== "undefined" && !!(import.meta as any).env;

    // 2. Safely extract environment variables based on the active runtime
    const envName = isViteFrontend
      ? (import.meta as any).env.VITE_APP_NAME
      : typeof Bun !== "undefined"
        ? Bun.env.APP_NAME
        : undefined;
    const envVersion = isViteFrontend
      ? (import.meta as any).env.VITE_APP_VERSION
      : typeof Bun !== "undefined"
        ? Bun.env.APP_VERSION
        : undefined;
    const envApiKey = isViteFrontend
      ? (import.meta as any).env.VITE_API_KEY
      : typeof Bun !== "undefined"
        ? Bun.env.API_KEY
        : undefined;

    // Fix 2: Added missing definitions for author and email env extraction
    const envAuthor = isViteFrontend
      ? (import.meta as any).env.VITE_APP_AUTHOR
      : typeof Bun !== "undefined"
        ? Bun.env.APP_AUTHOR
        : undefined;
    const envEmail = isViteFrontend
      ? (import.meta as any).env.VITE_APP_EMAIL
      : typeof Bun !== "undefined"
        ? Bun.env.APP_EMAIL
        : undefined;

    // 3. Fallback hierarchy: Environment Variable -> package.json -> Hardcoded String
    const rawConfig: AppConfig = {
      // Fix 3: Changed fallback 'null' to string defaults to match the AppConfig interface types
      name: envName || pkg.name || "Unicode Cheatsheet",
      version: envVersion || pkg.version || "0.1.0",
      author:
        envAuthor ||
        (typeof pkg.author === "string" ? pkg.author : "Dustin Dew"),
      email: envEmail || "phyxashun@gmail.com",
      license: pkg.license || "MIT",
      apiKey: envApiKey || "default_dev_key",
    };

    this.App = Settings.deepFreeze(rawConfig);

    // Optional: Log environment during initialization
    if (typeof window !== "undefined") {
      console.log("Settings initialized in Browser (Vite)");
    } else {
      console.log("Settings initialized in Backend (Bun)");
    }
  }

  public static getInstance(): Settings {
    return Settings.instance;
  }

  private static deepFreeze<T extends object>(obj: T): T {
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
      const value = (obj as Record<string, any>)[name];
      if (value && typeof value === "object") {
        Settings.deepFreeze(value);
      }
    }
    return Object.freeze(obj);
  }
}
