import type { Server as HttpServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { displayTitle } from "../../shared/event-display";
import type { EventStore } from "../event-store";
import { compileFilter, detail, overallStatus, summarize, EventFilter } from "./query";
import { waitForEvents } from "./wait";

export const DEFAULT_MCP_PORT = 3100;

export interface McpStatus {
    collectorPort: number;
    paused: boolean;
}

export interface McpDeps {
    store: EventStore;
    getStatus(): McpStatus;
}

const INSTRUCTIONS = `Reads Snowplow events captured live by NepperSnowplow.
Be frugal with tokens:
- To react to events as they happen, call wait_for_events (blocks until new events arrive). Pass the returned next_after_id back as after_id to continue without gaps.
- To look at what already happened, call search_events (newest first, one line per event). Use list_schemas first for an overview.
- Only call get_event for the few ids you actually need, and expand contexts selectively.`;

const filterShape = {
    query: z
        .string()
        .optional()
        .describe(
            "Space-separated terms, all must appear (case-insensitive) in schema names or payload/context values",
        ),
    schema: z
        .string()
        .optional()
        .describe(
            "Substring of the event schema name, e.g. 'page_view' or 'GENERIC / view_component'",
        ),
    context: z.string().optional().describe("Substring of an attached context schema name"),
    kind: z.enum(["self-describing", "structured"]).optional(),
    validity: z
        .enum(["valid", "invalid", "unknown"])
        .optional()
        .describe("'unknown' = not validated by Snowplow Micro"),
};

type FilterArgs = { [K in keyof typeof filterShape]?: z.infer<(typeof filterShape)[K]> };

function toFilter(args: FilterArgs): EventFilter {
    return {
        query: args.query,
        schema: args.schema,
        context: args.context,
        kind: args.kind,
        validity: args.validity,
    };
}

const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });

export function createMcpServer({ store, getStatus }: McpDeps): McpServer {
    const server = new McpServer(
        { name: "nepsnowplow", version: "1.0.0" },
        { instructions: INSTRUCTIONS },
    );

    server.registerTool(
        "get_status",
        {
            description:
                "Collector status: port, paused flag, number of buffered events, newest event id.",
        },
        async () => {
            const { collectorPort, paused } = getStatus();
            const invalid = store.all().filter((e) => overallStatus(e) === "invalid").length;
            return text(
                `collector_port=${collectorPort} paused=${paused} events=${store.size} invalid=${invalid} latest_id=${store.latestId}`,
            );
        },
    );

    server.registerTool(
        "list_schemas",
        {
            description:
                "Cheapest overview: event count per schema/title, with invalid counts. Use before search_events to know what exists.",
            inputSchema: {
                ...filterShape,
                after_id: z
                    .number()
                    .int()
                    .optional()
                    .describe("Only events with id greater than this"),
            },
        },
        async ({ after_id, ...rest }) => {
            const matches = compileFilter({ ...toFilter(rest), afterId: after_id });
            const counts = new Map<string, { total: number; invalid: number }>();
            for (const e of store.all()) {
                if (!matches(e)) continue;
                const entry = counts.get(displayTitle(e)) ?? { total: 0, invalid: 0 };
                entry.total++;
                if (overallStatus(e) === "invalid") entry.invalid++;
                counts.set(displayTitle(e), entry);
            }
            if (counts.size === 0) return text("no events");
            return text(
                [...counts]
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(
                        ([name, c]) =>
                            `${name} ${c.total}${c.invalid ? ` (${c.invalid} invalid)` : ""}`,
                    )
                    .join("\n"),
            );
        },
    );

    server.registerTool(
        "search_events",
        {
            description:
                "Search events already captured. Returns one compact line per event (id, time, title, validity, context names). Use get_event for full payloads.",
            inputSchema: {
                ...filterShape,
                limit: z.number().int().min(1).max(100).default(20),
                order: z.enum(["newest", "oldest"]).default("newest"),
                after_id: z
                    .number()
                    .int()
                    .optional()
                    .describe("Only events with id greater than this (paging for order=oldest)"),
                before_id: z
                    .number()
                    .int()
                    .optional()
                    .describe("Only events with id lower than this (paging for order=newest)"),
                preview_chars: z
                    .number()
                    .int()
                    .min(0)
                    .max(300)
                    .default(0)
                    .describe(
                        "Append a payload preview of this many characters to each line (0 = none)",
                    ),
            },
        },
        async ({ limit, order, after_id, before_id, preview_chars, ...rest }) => {
            const matches = compileFilter({
                ...toFilter(rest),
                afterId: after_id,
                beforeId: before_id,
            });
            const found = store.all().filter(matches);
            const ordered = order === "newest" ? found.slice().reverse() : found.slice();
            const shown = ordered.slice(0, limit);

            const lines = [
                `matches=${found.length} shown=${shown.length} latest_id=${store.latestId}`,
            ];
            for (const e of shown) lines.push(summarize(e, preview_chars));
            if (shown.length < found.length) {
                const last = shown[shown.length - 1].id;
                lines.push(
                    order === "newest" ? `more: before_id=${last}` : `more: after_id=${last}`,
                );
            }
            return text(lines.join("\n"));
        },
    );

    server.registerTool(
        "wait_for_events",
        {
            description:
                "Listen live: blocks until new events matching the filter arrive (or the timeout elapses), then returns them as compact lines. Call repeatedly with after_id=next_after_id to follow the stream without gaps. Without after_id, only events arriving after this call are returned.",
            inputSchema: {
                ...filterShape,
                after_id: z
                    .number()
                    .int()
                    .optional()
                    .describe(
                        "Cursor from a previous call's next_after_id. Default: the current newest id (only future events)",
                    ),
                timeout_seconds: z.number().min(1).max(55).default(30),
                max_events: z.number().int().min(1).max(50).default(10),
                preview_chars: z.number().int().min(0).max(300).default(0),
            },
        },
        async ({ after_id, timeout_seconds, max_events, preview_chars, ...rest }, extra) => {
            const result = await waitForEvents(store, compileFilter(toFilter(rest)), {
                afterId: after_id ?? store.latestId,
                maxEvents: max_events,
                timeoutMs: timeout_seconds * 1000,
                signal: extra.signal,
            });
            const lines = [
                result.timedOut
                    ? `no matching events within ${timeout_seconds}s next_after_id=${result.cursor}`
                    : `events=${result.events.length} next_after_id=${result.cursor}`,
                ...result.events.map((e) => summarize(e, preview_chars)),
            ];
            return text(lines.join("\n"));
        },
    );

    server.registerTool(
        "get_event",
        {
            description:
                "Full details of one event as JSON. Long strings/arrays are truncated and contexts are listed by name only unless requested via 'contexts'.",
            inputSchema: {
                id: z.number().int(),
                contexts: z
                    .array(z.string())
                    .default([])
                    .describe("Context schema name substrings to expand; ['*'] expands all"),
                max_string_length: z.number().int().min(20).max(5000).default(300),
                max_chars: z.number().int().min(200).max(50000).default(4000),
            },
        },
        async ({ id, contexts, max_string_length, max_chars }) => {
            const event = store.all().find((e) => e.id === id);
            if (!event)
                return {
                    ...text(`event #${id} not found (evicted or never existed)`),
                    isError: true,
                };
            return text(
                detail(event, { contexts, maxString: max_string_length, maxChars: max_chars }),
            );
        },
    );

    return server;
}

export interface RunningMcpServer {
    port: number;
    close(): Promise<void>;
}

// Streamable-HTTP MCP endpoint at http://127.0.0.1:<port>/mcp. Bound to
// loopback only (captured events can hold personal data) and protected
// against DNS rebinding by the SDK's host-header validation. Stateless:
// each request gets its own server + transport, so clients can come and
// go freely and nothing survives a restart of the app.
export function startMcpServer(deps: McpDeps, port: number): Promise<RunningMcpServer> {
    const app = createMcpExpressApp({ host: "127.0.0.1" });

    app.post("/mcp", async (req, res) => {
        const server = createMcpServer(deps);
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on("close", () => {
            void transport.close();
            void server.close();
        });
        try {
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (err) {
            console.error("MCP request failed", err);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: "2.0",
                    error: { code: -32603, message: "Internal server error" },
                    id: null,
                });
            }
        }
    });

    // Stateless server: no SSE stream (GET) or session to terminate (DELETE).
    app.get("/mcp", (_req, res) => void res.status(405).end());
    app.delete("/mcp", (_req, res) => void res.status(405).end());

    return new Promise((resolve, reject) => {
        const listener: HttpServer = app.listen(port, "127.0.0.1", () => {
            const addr = listener.address();
            resolve({
                port: typeof addr === "object" && addr ? addr.port : port,
                close: () => new Promise((done) => listener.close(() => done())),
            });
        });
        listener.on("error", reject);
    });
}
