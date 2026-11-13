import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
    testDir: "./test",
    testMatch: "**/*.spec.ts",
    timeout: 60_000,
    workers: 1,
};
export default config;
