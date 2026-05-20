import type { EventViewModel, EventContext } from "../../../shared/event";

// Clean wire-friendly shape for events the user copies / exports. Drops
// view-model internals (id, timestamp, searchableText, isValid) that
// don't help when pasting a payload into another tool, but keeps the
// validation summary so the receiver can see whether the event was
// accepted by snowplow-micro.

interface SerializedContext {
    schema: string | null;
    payload: unknown;
    validation: { status: EventContext["validationStatus"]; errors?: string[] };
}

interface SerializedEvent {
    timestamp: string;
    schema: string | null;
    payload: unknown;
    contexts: SerializedContext[];
    validation: { status: EventViewModel["validationStatus"]; errors?: string[] };
}

function formatSchema(name: string, version: string): string | null {
    if (!name) return null;
    return version ? `${name}/${version}` : name;
}

export function serializeEvent(event: EventViewModel): SerializedEvent {
    return {
        timestamp: new Date(event.timestamp).toISOString(),
        schema: formatSchema(event.schema.name, event.schema.version),
        payload: event.payload,
        contexts: event.contexts.map((c) => ({
            schema: formatSchema(c.schema.name, c.schema.version),
            payload: c.payload,
            validation: { status: c.validationStatus, errors: c.errors },
        })),
        validation: { status: event.validationStatus, errors: event.errors },
    };
}

export function serializeEvents(events: EventViewModel[]): SerializedEvent[] {
    return events.map(serializeEvent);
}
