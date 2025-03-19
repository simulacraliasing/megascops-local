import globals from "globals";
import pluginJs from "@eslint/js";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";
import svelte from "eslint-plugin-svelte";

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs.recommended,
    {
        ignores: [
            "src-tauri/**",
            "node-modules/**",
            "build/**",
            ".svelte-kit/**",
        ],
    },
    {
        files: ["**/*.svelte", "**/*.svelte.ts"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                extraFileExtensions: [".svelte"],
                parser: ts.parser,
                svelteConfig,
            },
        },
    },
];
