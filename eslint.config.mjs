import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "generated/**",
    ".local/**",
    "artifacts/**",
    "out/**",
    "coverage/**",
    "design_handoff_coach_pantallas/**",
    "next-env.d.ts",
  ]),
  js.configs.recommended,
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-proto": "error",
      "no-extend-native": "error",
      "no-unused-vars": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["components/**/*.{ts,tsx}", "app/page.tsx", "lib/auth-client.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/db",
                "@/lib/auth",
                "@/lib/auth-mail",
                "@/lib/auth-session",
                "@/lib/openrouter",
                "@/lib/provider-diagnostics",
                "@/lib/usage",
                "@/lib/generation",
                "@/lib/history",
                "@/lib/server-image",
                "../lib/db",
                "../lib/auth",
                "../lib/openrouter",
                "../lib/provider-diagnostics",
                "../lib/usage",
              ],
              message: "Mantén autenticación, credenciales, IA y acceso a datos en el servidor.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: { globals: globals.serviceworker },
    rules: { "no-unused-vars": "error" },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      // Node's runner owns the promise returned by top-level test registration.
      "@typescript-eslint/no-floating-promises": [
        "error",
        { allowForKnownSafeCalls: [{ from: "package", name: "test", package: "node:test" }] },
      ],
      // Malicious URL literals are intentional rejection fixtures, never executed.
      "no-script-url": "off",
    },
  },
  prettier,
]);
