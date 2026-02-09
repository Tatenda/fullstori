import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig, // Must be last to override other configs
  {
    rules: {
      // Enable unused variable errors (auto-fixes unused imports on save)
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }],
      "no-unused-vars": "off", // Use TypeScript version instead
      // Disable React Hook exhaustive-deps warnings
      "react-hooks/exhaustive-deps": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores
    "node_modules/**",
    ".yarn/**",
    "dist/**",
    "*.config.js",
    "*.config.mjs",
    "prisma/migrations/**",
    "dev.db*",
  ]),
]);

export default eslintConfig;
