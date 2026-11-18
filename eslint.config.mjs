// Flat ESLint config. Strict TypeScript already covers correctness; this
// adds stylistic linting on top — unused vars/imports, exhaustive hook
// deps for the Preact components, and a Prettier compat layer so our
// formatter and linter never disagree.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
    {
        ignores: ["out", "dist", "node_modules", "jre", "test-results", "playwright-report"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/renderer/**/*.{ts,tsx}"],
        plugins: { "react-hooks": reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // React Compiler diagnostics ship in the recommended preset
            // but we don't run the compiler (Preact, no babel-plugin), so
            // its compatibility notes about third-party hooks are noise.
            "react-hooks/incompatible-library": "off",
        },
    },
    {
        rules: {
            // Underscore-prefixed names are conventional "intentionally
            // unused" markers (e.g. `_e` for an ignored IpcRendererEvent
            // arg). Allow them through both the unused-vars and unused
            // imports lints.
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "no-unused-vars": "off",
        },
    },
    prettierConfig,
);
