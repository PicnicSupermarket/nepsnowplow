import type { EventKind, EventViewModel, ValidationStatus } from "../../shared/event";
import { displayTitle } from "../../shared/event-display";

// Pure filtering + formatting helpers behind the MCP tools. Kept free of
// Electron / MCP imports so they can be unit tested on their own.
//
// Output is deliberately compact plain text (one line per event) rather
// than JSON: agents pay per token, and a one-line summary is usually
// enough to decide whether `get_event` is worth a second call.

export interface EventFilter {
    // Whitespace-separated terms; every term must occur (case-insensitive)
    // somewhere in the event's schema names or payload / context values.
    query?: string;
    // Substring of the event's own schema name (or structured title).
    schema?: string;
    // Substring of any attached context's schema name.
    context?: string;
    kind?: EventKind;
    validity?: ValidationStatus;
    // Exclusive id bounds.
    afterId?: number;
    beforeId?: number;
}

// Worst status across the payload and its contexts.
export function overallStatus(event: EventViewModel): ValidationStatus {
    const all = [event.validationStatus, ...event.contexts.map((c) => c.validationStatus)];
    if (all.includes("invalid")) return "invalid";
    if (all.includes("unknown")) return "unknown";
    return "valid";
}

export function compileFilter(filter: EventFilter): (event: EventViewModel) => boolean {
    const terms = (filter.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const schema = filter.schema?.toLowerCase();
    const context = filter.context?.toLowerCase();

    return (event) => {
        if (filter.afterId !== undefined && event.id <= filter.afterId) return false;
        if (filter.beforeId !== undefined && event.id >= filter.beforeId) return false;
        if (filter.kind && event.kind !== filter.kind) return false;
        if (filter.validity && overallStatus(event) !== filter.validity) return false;
        if (schema && !displayTitle(event).toLowerCase().includes(schema)) return false;
        if (context && !event.contexts.some((c) => c.schema.name.toLowerCase().includes(context))) {
            return false;
        }
        return terms.every((t) => event.searchableText.includes(t));
    };
}

function clip(text: string, max: number): string {
    return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function clock(timestamp: number): string {
    const d = new Date(timestamp);
    const p = (n: number, w = 2) => String(n).padStart(w, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(
        d.getMilliseconds(),
        3,
    )}`;
}

export function summarize(event: EventViewModel, previewChars = 0): string {
    const status = overallStatus(event);
    const parts = [`#${event.id}`, clock(event.timestamp), displayTitle(event)];
    parts.push(status === "unknown" ? "unvalidated" : status);
    if (event.contexts.length > 0) {
        parts.push(`ctx=${event.contexts.map((c) => c.schema.name).join(",")}`);
    }
    let line = parts.join(" ");
    if (status === "invalid") {
        const first = [event.errors, ...event.contexts.map((c) => c.errors)]
            .flat()
            .find((e): e is string => typeof e === "string");
        if (first) line += ` err="${clip(first, 120)}"`;
    }
    if (previewChars > 0) {
        line += ` ${clip(JSON.stringify(event.payload) ?? "", previewChars)}`;
    }
    return line;
}

const MAX_ARRAY_ITEMS = 20;

// Shrinks long strings / arrays so a single huge value (e.g. a serialized
// page tree) can't blow the agent's context. Truncation is marked inline.
function shrink(value: unknown, maxString: number): unknown {
    if (typeof value === "string") {
        return value.length <= maxString
            ? value
            : `${value.slice(0, maxString)}…(+${value.length - maxString} chars)`;
    }
    if (Array.isArray(value)) {
        const items = value.slice(0, MAX_ARRAY_ITEMS).map((v) => shrink(v, maxString));
        if (value.length > MAX_ARRAY_ITEMS) {
            items.push(`…(+${value.length - MAX_ARRAY_ITEMS} items)`);
        }
        return items;
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shrink(v, maxString)]));
    }
    return value;
}

export interface DetailOptions {
    // Context schema names (substring match) to include in full.
    // Contexts not listed are only named, never expanded.
    contexts: string[];
    maxString: number;
    maxChars: number;
}

export function detail(event: EventViewModel, opts: DetailOptions): string {
    const wanted = opts.contexts.map((c) => c.toLowerCase());
    const include = (name: string) =>
        wanted.includes("*") || wanted.some((w) => name.toLowerCase().includes(w));

    const body = {
        id: event.id,
        time: new Date(event.timestamp).toISOString(),
        title: displayTitle(event),
        kind: event.kind,
        schema: event.schema.name ? `${event.schema.name}@${event.schema.version}` : undefined,
        status: overallStatus(event),
        // "unknown" only ever carries the boilerplate "not validated"
        // message; the status already says it, so don't repeat it.
        errors: event.validationStatus === "unknown" ? undefined : event.errors,
        payload: shrink(event.payload, opts.maxString),
        contexts: event.contexts.map((c) => ({
            schema: `${c.schema.name}@${c.schema.version}`,
            status: c.validationStatus === "valid" ? undefined : c.validationStatus,
            errors: c.validationStatus === "unknown" ? undefined : c.errors,
            // `undefined` keys vanish in JSON, so omitted contexts show
            // as just a name + a hint on how to expand them.
            payload: include(c.schema.name) ? shrink(c.payload, opts.maxString) : undefined,
            omitted: include(c.schema.name) ? undefined : true,
        })),
    };
    const text = JSON.stringify(body);
    return text.length <= opts.maxChars
        ? text
        : `${text.slice(0, opts.maxChars)}…[truncated, ${
              text.length - opts.maxChars
          } chars omitted]`;
}
