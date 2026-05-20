// The view model that travels across the IPC boundary: main builds it
// when a Snowplow bundle arrives, the renderer's store holds it, and
// the list / details components render it directly. It deliberately
// carries everything either side needs so the renderer never has to
// reach back into main to flesh out a row.

export type ValidationStatus = "valid" | "invalid" | "unknown";

export interface EventSchema {
    name: string;
    version: string;
}

export interface EventContext {
    schema: EventSchema;
    payload: unknown;
    validationStatus: ValidationStatus;
    errors?: string[];
}

export interface EventViewModel {
    id: number;
    timestamp: number;
    schema: EventSchema;
    payload: unknown;
    validationStatus: ValidationStatus;
    errors?: string[];
    contexts: EventContext[];
    isValid: boolean;
    // Lower-cased haystack covering schema names, payload values, and
    // context values. Filtering in the renderer is an `includes` over
    // this string, so the search input never walks the structured event.
    searchableText: string;
}

// FIFO cap. Imported by both the main-process trackedEvents mirror and
// the renderer-side store so they evict in lockstep — a window reload
// re-seeded from main can never overflow the renderer.
export const MAX_EVENTS = 5000;
