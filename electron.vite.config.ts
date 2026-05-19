import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import preact from "@preact/preset-vite";
import { resolve } from "node:path";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: { index: resolve(__dirname, "src/main/index.ts") },
                external: ["electron"],
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: { index: resolve(__dirname, "src/preload/index.ts") },
                external: ["electron"],
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
