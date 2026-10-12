import globals from "globals";
import {defineConfig} from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: [
      "editor/**/*.{js,ts,tsx}",
      "runtime/**/*.{js,ts}",
      "test/**/*.{js,ts,tsx}",
      "app/**/*.{js,jsx,ts,tsx}",
      "lib/**/*.{js,ts}",
    ],
    plugins: {
      react: reactPlugin,
      "react-hooks": hooksPlugin,
    },
    languageOptions: {
      globals: {...globals.browser, ...globals.node},
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed in modern React
      "react/prop-types": "off", // Not needed with TypeScript or modern React
      "spaced-comment": ["error", "always"],
    },
  },
  // TypeScript-specific configuration
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["editor/**/*.{ts,tsx}", "runtime/**/*.ts", "test/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "lib/**/*.ts"],
  })),
  {
    ignores: ["**/*.recho.js", "test/output/**/*", ".next/**"],
  },
  eslintConfigPrettier,
]);
