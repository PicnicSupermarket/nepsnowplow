import fs from "node:fs";
import path from "node:path";
import { _electron as electron, ElectronApplication, Page } from "playwright";
import {
    test,
    expect,
    request as playwrightRequest,
    APIRequestContext,
} from "@playwright/test";

// Minimal Snowplow bundle. The cx blob is base64-encoded contexts in the
// envelope shape the tracker uses; ue_px is the base64-encoded
// unstructured-event envelope.
const SCHEMA = "iglu:com.example/page_view/jsonschema/1-0-0";
const CONTEXT_SCHEMA = "iglu:com.example/web_page/jsonschema/1-0-0";

const validBundle = {
    data: [
        {
            eid: "00000000-0000-4000-8000-000000000001",
            ue_px: Buffer.from(
                JSON.stringify({
                    schema: SCHEMA,
                    data: { page: "/home" },
                }),
            ).toString("base64"),
            cx: Buffer.from(
                JSON.stringify([{ schema: CONTEXT_SCHEMA, data: { id: "abc" } }]),
            ).toString("base64"),
        },
    ],
};

// Self-describing payload with multiple occurrences of the same substring,
// for exercising Enter-to-cycle through search matches.
const multiMatchBundle = {
    data: [
        {
            eid: "00000000-0000-4000-8000-000000000003",
            ue_px: Buffer.from(
                JSON.stringify({
                    schema: SCHEMA,
                    data: {
                        page: "/home",
                        title: "page title",
                        description: "another page",
                    },
                }),
            ).toString("base64"),
            cx: Buffer.from(JSON.stringify([])).toString("base64"),
        },
    ],
};

// Snowplow structured event: no schema URI, just the labelled fields.
const structuredBundle = {
    data: [
        {
            eid: "00000000-0000-4000-8000-000000000002",
            e: "se",
            se_ca: "GENERIC",
            se_ac: "view_component",
            cx: Buffer.from(JSON.stringify([])).toString("base64"),
        },
    ],
};

let app: ElectronApplication;
let window: Page;
let request: APIRequestContext;
let baseURL: string;

// The collector reports its bound port to globalThis once Express is
// listening. Poll for it (the JVM startup dominates wall-clock time so
// the window can mount well before the port is known).
async function resolveCollectorBaseURL(
    electronApp: ElectronApplication,
    { timeoutMs = 30_000, intervalMs = 250 } = {},
): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const port = await electronApp.evaluate(
            // The debug global is set by recordServerReady in src/main/index.ts.
            () =>
                (globalThis as { __nepsnowplowPort?: number }).__nepsnowplowPort ??
                null,
        );
        if (typeof port === "number" && port > 0) {
            return `http://127.0.0.1:${port}`;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error("Timed out waiting for the collector to bind a port");
}

test.beforeAll(async () => {
    app = await electron.launch({
        args: [path.join(__dirname, "..", "out", "main", "index.mjs")],
    });
    window = await app.firstWindow();
    baseURL = await resolveCollectorBaseURL(app);
    request = await playwrightRequest.newContext({ baseURL });
});

test.afterAll(async () => {
    await request?.dispose();
    await app?.close();
});

test.describe("collector", () => {
    test("rejects requests with no Snowplow data", async () => {
        const res = await request.post("/", { data: "", failOnStatusCode: false });
        expect(res.status()).toBe(400);
    });

    test("accepts a valid Snowplow bundle", async () => {
        const res = await request.post("/", {
            data: validBundle,
            failOnStatusCode: false,
        });
        expect(res.status()).toBe(204);
    });
});

test.describe("renderer", () => {
    test.beforeEach(async () => {
        // Each test starts from a clean event list so list assertions can
        // count visible rows without interference from earlier cases.
        await window.getByRole("button", { name: /clear/i }).click();
        await expect(window.locator('[role="option"]')).toHaveCount(0);
    });

    test("renders a captured event in the sidebar", async () => {
        await request.post("/", { data: validBundle, failOnStatusCode: false });

        const row = window.locator('[role="option"]').first();
        await expect(row).toBeVisible();
        await expect(row).toContainText("page_view");
        await expect(row).toContainText("web_page");
    });

    test("right-click on an event row opens a copy menu", async () => {
        await request.post("/", { data: validBundle, failOnStatusCode: false });
        const row = window.locator('[role="option"]').first();
        await row.click({ button: "right" });

        const menu = window.getByRole("menu");
        await expect(menu).toBeVisible();
        await expect(menu.getByRole("menuitem", { name: /copy event json/i })).toBeVisible();
        await expect(
            menu.getByRole("menuitem", { name: /export all visible events/i }),
        ).toBeVisible();

        await menu.getByRole("menuitem", { name: /copy event json/i }).click();
        await expect(menu).toBeHidden();
    });

    test("export button writes visible events to the chosen file", async () => {
        await request.post("/", { data: validBundle, failOnStatusCode: false });
        await expect(window.locator('[role="option"]').first()).toBeVisible();

        // Mock the save dialog inside the main process so the test doesn't
        // hit the OS picker. Capture the JSON payload that main receives
        // and write it through the original handler so we can read it
        // back from a temp file.
        const outFile = path.join(__dirname, "..", "test-results", "export.json");
        await app.evaluate(async ({ dialog }, target: string) => {
            (dialog as unknown as { showSaveDialog: unknown }).showSaveDialog =
                async () => ({ canceled: false, filePath: target, bookmark: "" });
        }, outFile);

        await window.getByRole("button", { name: /^export$/i }).click();

        // Wait for main to finish writing the file before reading.
        const fs = await import("node:fs");
        await expect.poll(() => fs.existsSync(outFile)).toBeTruthy();
        const written = JSON.parse(fs.readFileSync(outFile, "utf-8"));
        expect(Array.isArray(written)).toBe(true);
        expect(written.length).toBeGreaterThan(0);
        expect(written[0]).toMatchObject({
            schema: expect.stringContaining("page_view"),
        });
        fs.rmSync(outFile);
    });

    test("dropping events while paused", async () => {
        await window.getByRole("button", { name: /^pause$/i }).click();

        // Tracker still gets a 204 — the collector accepts the request,
        // it just doesn't store or forward the bundle.
        const res = await request.post("/", {
            data: validBundle,
            failOnStatusCode: false,
        });
        expect(res.status()).toBe(204);

        // Give the renderer a beat in case anything was going to land,
        // then assert the list stayed empty.
        await window.waitForTimeout(200);
        await expect(window.locator('[role="option"]')).toHaveCount(0);

        // Resuming restores capture for subsequent bundles.
        await window.getByRole("button", { name: /^resume$/i }).click();
        await request.post("/", { data: validBundle, failOnStatusCode: false });
        await expect(window.locator('[role="option"]').first()).toBeVisible();
    });

    test("Enter cycles through in-event search matches", async () => {
        await request.post("/", {
            data: multiMatchBundle,
            failOnStatusCode: false,
        });
        await window.locator('[role="option"]').first().click();

        const search = window.getByRole("searchbox", { name: "Search in event" });
        await search.fill("page");

        // Counter shows the active position and the total; payload has
        // three substrings containing "page" (key, two values).
        await expect(window.getByText("1 of 3")).toBeVisible();

        // Exactly one mark carries data-current=true at any time.
        const currentMarks = window.locator(
            'mark[data-kind="search"][data-current="true"]',
        );
        await expect(currentMarks).toHaveCount(1);

        await search.press("Enter");
        await expect(window.getByText("2 of 3")).toBeVisible();

        await search.press("Enter");
        await expect(window.getByText("3 of 3")).toBeVisible();

        // Wraps around at the end.
        await search.press("Enter");
        await expect(window.getByText("1 of 3")).toBeVisible();

        // Shift+Enter walks backwards (and also wraps).
        await search.press("Shift+Enter");
        await expect(window.getByText("3 of 3")).toBeVisible();
    });

    test("renders structured events as category / action with a Structured badge", async () => {
        await request.post("/", {
            data: structuredBundle,
            failOnStatusCode: false,
        });
        const row = window.locator('[role="option"]').first();
        await expect(row).toBeVisible();
        // Sidebar title comes from the synthesised category / action pair
        // rather than the legacy (no schema) fallback.
        await expect(row).toContainText("GENERIC / view_component");

        await row.click();
        const details = window.getByRole("region", { name: "Event details" });
        await expect(details.getByRole("heading", { level: 2 })).toHaveText(
            "GENERIC / view_component",
        );
        // Structured marker badge appears next to the validation badge.
        await expect(details.getByText("Structured", { exact: true })).toBeVisible();
    });

    test("shows event payload in the details pane when selected", async () => {
        await request.post("/", { data: validBundle, failOnStatusCode: false });

        const row = window.locator('[role="option"]').first();
        await row.click();

        // The details pane is a labelled region so the test doesn't have
        // to know which utility classes implement the layout.
        const details = window.getByRole("region", { name: "Event details" });
        await expect(details).toBeVisible();
        await expect(details.getByRole("heading", { level: 2 })).toHaveText("page_view");

        // Payload field is rendered in the JSON tree.
        await expect(details).toContainText("page");
        await expect(details).toContainText("/home");
    });
});

test.describe("settings", () => {
    // settings.json is tracked in git; snapshot it before the test mutates
    // it through the UI and restore the original bytes on the way out so
    // the working tree stays clean across runs.
    const settingsFile = path.join(__dirname, "..", "settings.json");
    let settingsSnapshot = "";

    test.beforeAll(() => {
        settingsSnapshot = fs.readFileSync(settingsFile, "utf-8");
    });

    test.afterAll(() => {
        fs.writeFileSync(settingsFile, settingsSnapshot, "utf-8");
    });

    test("changing the listening port restarts the collector on it", async () => {
        await window.getByRole("button", { name: /settings/i }).click();

        const portInput = window.getByRole("spinbutton");
        await expect(portInput).toBeVisible();

        // Ask the OS to pick a free port; the dialog closes once main has
        // restarted the listener and the renderer's store has picked up
        // the new serverInfo.
        await portInput.fill("0");
        await window.getByRole("button", { name: /^save$/i }).click();
        // Radix unmounts the dialog content on close, so assert on the
        // input the dialog owns rather than a wrapper class.
        await expect(portInput).toBeHidden();

        // The collector is now on a new port; ask main for it and confirm
        // it accepts a fresh bundle, proving the listener really moved
        // (rather than the dialog just closing on a stale value).
        const newPort = await app.evaluate(
            () => (globalThis as { __nepsnowplowPort?: number }).__nepsnowplowPort ?? 0,
        );
        expect(newPort).toBeGreaterThan(0);

        const probe = await playwrightRequest.newContext({
            baseURL: `http://127.0.0.1:${newPort}`,
        });
        try {
            const res = await probe.post("/", {
                data: validBundle,
                failOnStatusCode: false,
            });
            expect(res.status()).toBe(204);
        } finally {
            await probe.dispose();
        }

        // Future tests in this file pre-date the port change; rebuild the
        // shared request context against the new base URL so they don't
        // hit a dead listener.
        await request.dispose();
        baseURL = `http://127.0.0.1:${newPort}`;
        request = await playwrightRequest.newContext({ baseURL });
    });
});
