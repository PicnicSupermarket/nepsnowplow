import type {
    EventKind,
    EventViewModel,
    ValidationStatus,
    EventSchema,
} from "../../shared/event";
import type { MicroBadEvent, MicroGoodEvent } from "./snowplow-micro";

// Both `payload` and each `context` arrive on the wire as an Iglu envelope:
// `{ schema: "iglu:.../name/.../version", data: {...} }`. Some endpoints
// wrap that envelope in another `{ data: ... }`, which the caller unwraps
// before handing the result to this builder.
export interface SchemaEnvelope {
    schema?: string;
    data?: unknown;
}

export interface DecodedEvent {
    eid: string;
    kind: EventKind;
    payload: SchemaEnvelope;
    contexts: SchemaEnvelope[];
}

interface MicroFailureMessage {
    schemaKey: string;
    error: {
        error?: string;
        dataReports?: Array<{ message: string }>;
    };
}

function splitSchema(schema: string | undefined): EventSchema {
    if (!schema) return { name: "", version: "" };
    const parts = schema.split("/");
    return { name: parts[1] ?? "", version: parts[3] ?? "" };
}

function collectStrings(value: unknown, out: string[]): void {
    if (value === null || value === undefined) return;
    if (typeof value === "string") {
        out.push(value);
        return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        out.push(String(value));
        return;
    }
    if (Array.isArray(value)) {
        for (const v of value) collectStrings(v, out);
        return;
    }
    if (typeof value === "object") {
        for (const v of Object.values(value)) collectStrings(v, out);
    }
}

function buildErrorMap(badEvent: MicroBadEvent | undefined): Map<string, string[]> {
    const map = new Map<string, string[]>();
    // snowplow-micro packs the structured failure report into errors[1]
    // as a JSON string; everything before that is human-readable noise.
    const reportRaw = badEvent?.errors?.[1];
    if (!reportRaw) return map;
    let report: { data?: { failure?: { messages?: MicroFailureMessage[] } } };
    try {
        report = JSON.parse(reportRaw);
    } catch {
        return map;
    }
    const messages = report.data?.failure?.messages ?? [];
    for (const m of messages) {
        if (m.error.error === "ResolutionError") {
            map.set(m.schemaKey, ["Unable to resolve schema"]);
        } else {
            const reports = m.error.dataReports?.map((r) => r.message) ?? [];
            map.set(m.schemaKey, reports);
        }
    }
    return map;
}

interface Validation {
    status: ValidationStatus;
    errors?: string[];
}

function validate(
    item: SchemaEnvelope,
    badEvent: MicroBadEvent | undefined,
    goodEvent: MicroGoodEvent | undefined,
    errorMap: Map<string, string[]>,
): Validation {
    if (!badEvent && !goodEvent) {
        return { status: "unknown", errors: ["Event not validated using Snowplow Micro"] };
    }
    if (item.schema && errorMap.has(item.schema)) {
        return { status: "invalid", errors: errorMap.get(item.schema) };
    }
    return { status: "valid" };
}

export function buildEventViewModel(
    id: number,
    decoded: DecodedEvent,
    badEvents: MicroBadEvent[],
    goodEvents: MicroGoodEvent[],
): EventViewModel {
    const badEvent = badEvents.find((e) => e.rawEvent?.parameters.eid === decoded.eid);
    const goodEvent = goodEvents.find((e) => e.rawEvent?.parameters.eid === decoded.eid);
    const errorMap = buildErrorMap(badEvent);

    const payloadValidation = validate(decoded.payload, badEvent, goodEvent, errorMap);
    const contexts = decoded.contexts.map((ctx) => {
        const v = validate(ctx, badEvent, goodEvent, errorMap);
        return {
            schema: splitSchema(ctx.schema),
            payload: ctx.data,
            validationStatus: v.status,
            errors: v.errors,
        };
    });

    const isValid =
        payloadValidation.status === "valid" &&
        contexts.every((c) => c.validationStatus === "valid");

    const haystack: string[] = [splitSchema(decoded.payload.schema).name];
    for (const c of contexts) haystack.push(c.schema.name);
    collectStrings(decoded.payload.data, haystack);
    for (const c of contexts) collectStrings(c.payload, haystack);

    return {
        id,
        timestamp: Date.now(),
        kind: decoded.kind,
        schema: splitSchema(decoded.payload.schema),
        payload: decoded.payload.data,
        validationStatus: payloadValidation.status,
        errors: payloadValidation.errors,
        contexts,
        isValid,
        searchableText: haystack
            .filter((s) => typeof s === "string" && s.length > 0)
            .join("\n")
            .toLowerCase(),
    };
}
