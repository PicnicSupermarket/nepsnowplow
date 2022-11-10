// playwright.config.ts
import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
    testDir: "./test",
    testMatch: "**/*.js",
};
export default config;
