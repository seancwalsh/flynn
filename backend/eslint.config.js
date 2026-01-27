import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  eslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Bun: "readonly",
        Buffer: "readonly",
        RequestInit: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        fetch: "readonly",
        Date: "readonly",
        Map: "readonly",
        Set: "readonly",
        JSON: "readonly",
        Error: "readonly",
        Promise: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      
      // Additional strict rules
      "@typescript-eslint/explicit-function-return-type": ["error", {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      }],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/strict-boolean-expressions": ["error", {
        allowString: false,
        allowNumber: false,
        allowNullableObject: true,
        allowNullableBoolean: false,
        allowNullableString: false,
        allowNullableNumber: false,
        allowAny: false,
      }],
      
      // Unused vars (with underscore exception)
      "@typescript-eslint/no-unused-vars": ["error", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      
      // Disable base rules that conflict
      "no-unused-vars": "off",
      "no-undef": "off", // TypeScript handles this
      "require-await": "off", // Using @typescript-eslint version
      
      // General
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "drizzle/", "*.js"],
  },
  prettier,
];
