const { _electron: electron } = require("playwright");
const { test, expect, request: playwrightRequest } = require("@playwright/test");

const path = require("path");

const base64 = require("../server/base64");

const validSnowplowObject = {
    data: [
        {
            eid: "00000000-0000-4000-8000-000000000001",
            uid: "userid",
            ue_px: base64.encode('{"schema": "iglu:snowplow/event_schema/jsonschema/1-0-0"}'),
            cx: base64.encode('[{"schema": "iglu:snowplow/context_schema/jsonschema/1-0-0"}]'),
        },
    ],
};

let app;
let request;
let baseURL;

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// The port the HTTP server actually binds to is decided at runtime: it starts
// from `settings.json` (which may be customised per-developer or marked
// skip-worktree), and `Server.listen` falls back to a random free port when
// the proposed one is already in use. Hardcoding a port in the tests means a
// single config drift or a busy port turns the whole suite into connection
// errors, so instead we ask the main process for the value it actually wrote
// back to `global.options.listeningPort` once binding succeeded, then probe
// the socket until it answers.
async function resolveServerBaseURL(electronApp, { timeoutMs = 20000, intervalMs = 100 } = {}) {
    const deadline = Date.now() + timeoutMs;
    const probe = await playwrightRequest.newContext();
    let lastPort;

    try {
        while (Date.now() < deadline) {
            // Re-read the port on every iteration: `global.options.listeningPort`
            // starts at the value loaded from settings.json and is overwritten
            // by Server.listen() once binding succeeds, which may be on a
            // different port if the proposed one was in use.
            // eslint-disable-next-line no-await-in-loop
            const port = await electronApp.evaluate(
                () => global.options && global.options.listeningPort
            );
            if (typeof port === "number" && port > 0) {
                lastPort = port;
                try {
                    // eslint-disable-next-line no-await-in-loop
                    const response = await probe.post(`http://127.0.0.1:${port}/`, {
                        data: "",
                        failOnStatusCode: false,
                        timeout: 1000,
                    });
                    // Any HTTP response (even 400) proves our server is the
                    // one bound here. A foreign listener that accepts TCP but
                    // never replies will time out and we'll loop, by which
                    // point Server.listen has fallen back to a random port.
                    if (response.status() > 0) {
                        return `http://127.0.0.1:${port}`;
                    }
                } catch (_) {
                    // Connection refused / reset / timed out — keep polling.
                }
            }
            // eslint-disable-next-line no-await-in-loop
            await sleep(intervalMs);
        }
    } finally {
        await probe.dispose();
    }
    throw new Error(
        `Timed out waiting for neppersnowplow server (last seen port: ${lastPort ?? "none"})`
    );
}

async function clickReset() {
    const window = await app.firstWindow();
    await window.locator("#reset-button").click();
    // The renderer clears events synchronously, but the IPC mirror to main and
    // the Snowplow Micro reset both round-trip; give them a beat to drain so
    // the next test starts from a clean slate.
    await window.locator("#events-container li").first().waitFor({ state: "detached" }).catch(() => {});
}

test.beforeAll(async () => {
    app = await electron.launch({ args: [path.join(__dirname, "..", "app.js")] });
    // Wait for the renderer window to exist before asking main for the port —
    // `Server` is constructed in the renderer, so until the window is up the
    // port hasn't been written back to `global.options`.
    await app.firstWindow();
    baseURL = await resolveServerBaseURL(app);
    request = await playwrightRequest.newContext({ baseURL });
});

test.afterAll(async () => {
    await request?.dispose();
    await app?.close();
});

test.describe("server", () => {
    test("is running", async () => {
        const response = await request.post("/", { data: "", failOnStatusCode: false });
        expect(response.status()).not.toBe(404);
    });

    test("rejects non-Snowplow data", async () => {
        const response = await request.post("/", { data: "", failOnStatusCode: false });
        // Empty body has no `data` array, so the handler short-circuits with
        // 400. Asserting the specific status (instead of "anything but 204")
        // catches regressions where a malformed payload silently 2xxs.
        expect(response.status()).toBe(400);
    });

    test("accepts Snowplow event", async () => {
        const response = await request.post("/", {
            data: validSnowplowObject,
            failOnStatusCode: false,
        });
        expect(response.status()).toBe(204);
    });
});

test.describe("application", () => {
    test.beforeEach(async () => {
        // Each test owns its DOM state; without this, events accumulated by
        // earlier tests in the file make `#event-0` ambiguous and assertions
        // like "this test's event is rendered" can pass for the wrong reason.
        await clickReset();
    });

    test("logs Snowplow event", async () => {
        const response = await request.post("/", {
            data: validSnowplowObject,
            failOnStatusCode: false,
        });
        expect(response.status()).toBe(204);

        const window = await app.firstWindow();
        await expect(window.locator("#event-0")).toHaveCount(1);
    });
});
