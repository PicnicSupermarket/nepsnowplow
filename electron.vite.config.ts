import { defineConfig } from "electron-vite";
import preact from "@preact/preset-vite";
import { createRequire } from "node:module";
import { resolve } from "node:path";

interface PkgJson {
    dependencies?: Record<string, string>;
}

// All runtime dependencies are kept external from the main/preload
// bundles so Electron loads them from node_modules at runtime. Electron
// itself is a devDependency but obviously also runs from node_modules,
// hence the explicit entry.
const pkg = createRequire(import.meta.url)("./package.json") as PkgJson;
const externalDeps = new Set<string>([
    ...Object.keys(pkg.dependencies ?? {}),
    "electron",
]);

function isExternal(id: string): boolean {
    if (externalDeps.has(id)) return true;
    // Subpath imports of an external package (e.g. "electron/main") also
    // resolve from node_modules at runtime.
    for (const dep of externalDeps) {
        if (id === dep || id.startsWith(`${dep}/`)) return true;
    }
    // Node built-ins under both forms.
    return id.startsWith("node:");
}

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                input: { index: resolve(__dirname, "src/main/index.ts") },
                external: isExternal,
            },
        },
    },
    preload: {
        build: {
            // Sandboxed preload scripts must be CommonJS — Electron's
            // sandbox loader can't execute ESM. Vite would otherwise emit
            // .mjs which fails with "Cannot use import statement outside a
            // module" at load time.
            rollupOptions: {
                input: { index: resolve(__dirname, "src/preload/index.ts") },
                external: isExternal,
                output: {
                    format: "cjs",
                    entryFileNames: "[name].cjs",
                },
            },
        },
    },
    renderer: {
        root: resolve(__dirname, "src/renderer"),
        plugins: [preact()],
        build: {
            rollupOptions: {
                input: { index: resolve(__dirname, "src/renderer/index.html") },
            },
        },
    },
});
