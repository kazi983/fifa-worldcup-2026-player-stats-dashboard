import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import jsdoc from "eslint-plugin-jsdoc";

export default [
  { ignores: ["**/dist/", "**/.astro/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.ts"],
    ...jsdoc.configs["flat/recommended-typescript-error"],
  },
  {
    files: ["**/*.ts"],
    rules: {
      "jsdoc/require-jsdoc": ["error", { publicOnly: true }],
      "jsdoc/require-description": "error",
    },
  },
];
