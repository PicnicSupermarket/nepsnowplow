import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { EventStore } from "../src/main/event-store";
import { RunningMcpServer, startMcpServer } from "../src/main/mcp/server";
import type { EventViewModel } from "../src/shared/event";

// Exercises the MCP endpoint end to end over real HTTP, without Electron.

function addEvent(
    store: EventStore,
    name: string,
    data: Record<string, unknown>,
    opts: { contexts?: string[]; invalid?: boolean } = {},
): EventViewModel {
    const status = opts.invalid ? "invalid" : "valid";
    const event: EventViewModel = {
        id: store.allocateId(),
        timestamp: Date.now(),
        kind: "self-describing",
        schema: { name, version: "1-0-0" },
        payload: data,
        validationStatus: status,
        errors: opts.invalid ? ["missing required property"] : undefined,
        contexts: (opts.contexts ?? []).map((c) => ({
            schema: { name: c, version: "1-0-0" },
            payload: { value: "x".repeat(1000) },
            validationStatus: "valid",
        })),
        isValid: !opts.invalid,
        searchableText: [name, ...Object.values(data).map(String)].join("\n").toLowerCase(),
    };
    store.add(event);
    return event;
}

let store: EventStore;
let running: RunningMcpServer;
let client: Client;

test.beforeEach(async () => {
    store = new EventStore();
    running = await startMcpServer(
        { store, getStatus: () => ({ collectorPort: 3000, paused: false }) },
        0,
    );
    client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(
        new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${running.port}/mcp`)),
    );
});

test.afterEach(async () => {
    await client.close();
    await running.close();
});

async function call(name: string, args: Record<string, unknown> = {}): Promise<string> {
    const result = await client.callTool({ name, arguments: args });
    const content = result.content as Array<{ type: string; text: string }>;
    return content[0].text;
}

test("lists the expected tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
        "get_event",
        "get_status",
        "list_schemas",
        "search_events",
        "wait_for_events",
    ]);
});

test("search_events returns compact newest-first lines and pages", async () => {
    addEvent(store, "page_view", { page: "/home" });
    addEvent(store, "add_to_cart", { sku: "apple" }, { invalid: true });
    addEvent(store, "page_view", { page: "/basket" }, { contexts: ["web_page"] });

    const all = (await call("search_events", { limit: 2 })).split("\n");
    expect(all[0]).toBe("matches=3 shown=2 latest_id=2");
    expect(all[1]).toContain("#2");
    expect(all[1]).toContain("ctx=web_page");
    expect(all[2]).toContain("#1");
    expect(all[2]).toContain('err="missing required property"');
    expect(all[3]).toBe("more: before_id=1");

    const byText = await call("search_events", { query: "BASKET" });
    expect(byText).toContain("matches=1");
    expect(await call("search_events", { validity: "invalid" })).toContain("matches=1");
    expect(await call("search_events", { schema: "page_view" })).toContain("matches=2");
    expect(await call("search_events", { context: "web_page" })).toContain("matches=1");
});

test("get_event truncates and only expands requested contexts", async () => {
    addEvent(store, "page_view", { page: "/home" }, { contexts: ["web_page", "user"] });

    const collapsed = JSON.parse(await call("get_event", { id: 0 }));
    expect(collapsed.contexts.every((c: { omitted?: boolean }) => c.omitted)).toBe(true);

    const expanded = JSON.parse(await call("get_event", { id: 0, contexts: ["web_page"] }));
    expect(expanded.contexts[0].payload.value).toContain("(+");
    expect(expanded.contexts[1].omitted).toBe(true);

    expect(await call("get_event", { id: 99 })).toContain("not found");
});

test("get_event omits boilerplate errors for unvalidated events", async () => {
    const event = addEvent(store, "page_view", { page: "/home" }, { contexts: ["web_page"] });
    event.validationStatus = "unknown";
    event.errors = ["Event not validated using Snowplow Micro"];
    event.contexts[0].validationStatus = "unknown";
    event.contexts[0].errors = ["Event not validated using Snowplow Micro"];

    const text = await call("get_event", { id: event.id });
    expect(text).not.toContain("not validated");
    expect(JSON.parse(text).status).toBe("unknown");
});

test("wait_for_events returns existing matches after a cursor", async () => {
    addEvent(store, "page_view", { page: "/a" });
    addEvent(store, "page_view", { page: "/b" });

    const out = (await call("wait_for_events", { after_id: -1, max_events: 1 })).split("\n");
    expect(out[0]).toBe("events=1 next_after_id=0");
    expect(out[1]).toContain("#0");
});

test("wait_for_events blocks until a matching event arrives", async () => {
    const pending = call("wait_for_events", { schema: "add_to_cart", timeout_seconds: 10 });
    setTimeout(() => {
        addEvent(store, "page_view", { page: "/ignored" });
        addEvent(store, "add_to_cart", { sku: "pear" });
    }, 200);

    const out = (await pending).split("\n");
    expect(out[0]).toBe("events=1 next_after_id=1");
    expect(out[1]).toContain("add_to_cart");
});

test("wait_for_events times out with a usable cursor", async () => {
    addEvent(store, "page_view", { page: "/a" });
    const out = await call("wait_for_events", { timeout_seconds: 1 });
    expect(out).toBe("no matching events within 1s next_after_id=0");
});

test("cursors survive clearing the store", async () => {
    addEvent(store, "page_view", { page: "/a" });
    store.clear();
    addEvent(store, "page_view", { page: "/b" });
    expect(await call("get_status")).toContain("latest_id=1");
});

test("rejects requests with a foreign Host header", async () => {
    const res = await fetch(`http://127.0.0.1:${running.port}/mcp`, {
        method: "POST",
        headers: { Host: "evil.example.com", "content-type": "application/json" },
        body: "{}",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
});
