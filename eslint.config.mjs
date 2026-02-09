import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig, // Must be last to override other configs
  {
    // Allow console.log in Prisma scripts (migrations, seeds)
    files: ["prisma/**"],
    rules: {
      "no-console": "off",
      "no-await-in-loop": "off", // Common in migration scripts
    },
  },
  {
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }],
      "no-unused-vars": "off", // Use TypeScript version instead
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off", // Too strict for most projects
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": ["warn", {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": true,
        "ts-check": false
      }],
      "@typescript-eslint/consistent-type-imports": ["warn", {
        "prefer": "type-imports",
        "fixStyle": "inline-type-imports"
      }],
      
      // React rules
      "react-hooks/exhaustive-deps": "off", // Disabled as per current config
      "react-hooks/rules-of-hooks": "error",
      "react/no-unescaped-entities": "warn",
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-uses-react": "off", // Not needed with React 17+
      "react/jsx-uses-vars": "error",
      "react/no-array-index-key": "warn",
      "react/no-danger": "warn",
      "react/no-deprecated": "warn",
      "react/no-direct-mutation-state": "error",
      "react/no-unknown-property": "error",
      "react/prop-types": "off", // Using TypeScript instead
      "react/react-in-jsx-scope": "off", // Not needed with React 17+
      
      // General code quality
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "warn",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "warn",
      "prefer-template": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      
      // Async/await best practices
      "no-async-promise-executor": "error",
      "no-await-in-loop": "warn",
      "require-await": "warn",
      
      // Error handling
      "no-throw-literal": "error",
      "prefer-promise-reject-errors": "error",
      
      // Import/export
      "no-duplicate-imports": "error",
      "no-useless-rename": "warn",
      
      // Security
      "no-new-wrappers": "error",
      "no-iterator": "error",
      "no-proto": "error",
      
      // Code style (complementary to Prettier)
      "eqeqeq": ["error", "always", { "null": "ignore" }],
      "no-else-return": "warn",
      "no-lonely-if": "warn",
      "no-nested-ternary": "warn",
      "no-unneeded-ternary": "warn",
      "yoda": "error",
      
      // Next.js specific
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "warn",
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
