// ~ FILE-PATH: /eslint.config.ts

import { globalIgnores } from "eslint/config";
import globals from "globals";
import { __dirname } from "path";
import js from "@eslint/js";
import ts from "typescript-eslint";
import tsParser from "@typescript-eslint/parser";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettierConfig from "eslint-config-prettier/flat";
import prettierPlugin from "eslint-plugin-prettier/recommended";

export default ts.config(
  // GLOBAL IGNORES
  globalIgnores([
    ".vscode/**",
    "ALL/**",
    "**/node_modules/**",
    "public/**",
    "build/**",
    "dist/**",
  ]),

  // CUSTOM RULES AND OVERRIDES
  {
    files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
    ...react.configs.flat.recommended,
    extends: [
      js.configs.recommended,

      // Remove tseslint.configs.recommended and replace with this
      ts.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ts.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ts.configs.stylisticTypeChecked,

      betterTailwindcss.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      "@typescript-eslint": ts.plugin,
      betterTailwindcss,
      react,
      reactHooks,
      reactRefresh,
      prettierPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: __dirname,
      },
      ...react.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "./src/styles.css",
        detectComponentClasses: true,
      },
      react: {
        version: "detect",
      },
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      quotes: [
        "error",
        "single",
        { avoidEscape: true, allowTemplateLiterals: true },
      ],
      semi: ["error", "always"],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "tailwindcss/no-custom-classname": "off",
      "better-tailwindcss/no-unknown-classes": "off",
      "react/jsx-max-props-per-line": ["error", { maximum: 1 }],
      "react/jsx-first-prop-new-line": ["error", "multiline"],
    },
  },

  // PRETTIER MUST BE LAST
  prettierConfig,
  prettierPlugin,
);
