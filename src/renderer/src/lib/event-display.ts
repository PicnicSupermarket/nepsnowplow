import type { EventViewModel } from "../../../shared/event";

// Renders a human-readable title for an event without inventing data
// the wire didn't carry:
//
// - self-describing events use their Iglu schema name (e.g. "page_view")
// - structured events synthesise from their `category` / `action` pair
//   (e.g. "GENERIC / view_component") since the protocol leaves them
//   schemaless on purpose
//
// Anything that falls through both shapes lands on "(no schema)" so the
// row still has a stable label rather than an empty string.
export function displayTitle(event: EventViewModel): string {
    if (event.kind === "structured") {
        const data = event.payload as Record<string, unknown> | null | undefined;
        const category = data?.category;
        const action = data?.action;
        if (typeof category === "string" && typeof action === "string") {
            return `${category} / ${action}`;
        }
        if (typeof action === "string") return action;
        if (typeof category === "string") return category;
        return "(structured event)";
    }
    return event.schema.name || "(no schema)";
}
