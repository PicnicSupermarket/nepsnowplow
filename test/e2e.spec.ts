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
        // eslint-disable-next-line no-await-in-loop
        const port = await electronApp.evaluate(
            // The debug global is set by recordServerReady in src/main/index.ts.
            () =>
                (globalThis as { __nepsnowplowPort?: number }).__nepsnowplowPort ??
                null,
        );
        if (typeof port === "number" && port > 0) {
            return `http://127.0.0.1:${port}`;
        }
        // eslint-disable-next-line no-await-in-loop
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

    test("shows event payload in the details pane when selected", async () => {
        await request.post("/", { data: validBundle, failOnStatusCode: false });

        const row = window.locator('[role="option"]').first();
        await row.click();

        // Schema name appears in the details header.
        const details = window.locator(".details");
        await expect(details).toBeVisible();
        await expect(details.locator(".details__schema")).toHaveText("page_view");

        // Payload field is rendered in the JSON tree.
        await expect(details).toContainText("page");
        await expect(details).toContainText("/home");
    });
});
