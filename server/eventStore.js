// Renderer-local store for tracked events.
//
// History: the renderer used to ask the main process for `trackedEvents` via
// `@electron/remote`'s `getGlobal`, which is a synchronous IPC round-trip.
// That call sat on the hot path for every event insert and every keystroke in
// the filter, so the renderer would stall under bursty traffic. The renderer
// is the only consumer of `trackedEvents` for display/filtering purposes, so
// we keep an authoritative copy here and mirror writes to main asynchronously
// for persistence across reloads.

const searchableEntries = [];
const events = [];

function collectStrings(value, out) {
    if (value === null || value === undefined) {
        return;
    }
    const type = typeof value;
    if (type === "string") {
        out.push(value);
    } else if (type === "number" || type === "boolean") {
        out.push(String(value));
    } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i += 1) {
            collectStrings(value[i], out);
        }
    } else if (type === "object") {
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i += 1) {
            collectStrings(value[keys[i]], out);
        }
    }
}

function schemaName(payloadLike) {
    if (!payloadLike || !payloadLike.obj) {
        return undefined;
    }
    const { schema } = payloadLike.obj;
    if (typeof schema === "string") {
        return schema.split("/")[1];
    }
    return undefined;
}

function buildSearchable(event) {
    const parts = [];

    parts.push(schemaName(event.payload));
    if (Array.isArray(event.contexts)) {
        for (let i = 0; i < event.contexts.length; i += 1) {
            parts.push(schemaName(event.contexts[i]));
        }
    }

    if (event.payload?.obj?.data) {
        collectStrings(event.payload.obj.data, parts);
    }
    if (Array.isArray(event.contexts)) {
        for (let i = 0; i < event.contexts.length; i += 1) {
            const ctx = event.contexts[i];
            if (ctx?.obj?.data) {
                collectStrings(ctx.obj.data, parts);
            }
        }
    }

    return parts
        .filter((p) => typeof p === "string" && p.length > 0)
        .join("\n")
        .toLowerCase();
}

function add(event) {
    const index = events.length;
    events.push(event);
    searchableEntries.push(buildSearchable(event));
    return index;
}

function get(index) {
    return events[index];
}

function getSearchable(index) {
    return searchableEntries[index];
}

function size() {
    return events.length;
}

function clear() {
    events.length = 0;
    searchableEntries.length = 0;
}

function seed(initialEvents) {
    if (!Array.isArray(initialEvents) || initialEvents.length === 0) {
        return;
    }
    for (let i = 0; i < initialEvents.length; i += 1) {
        add(initialEvents[i]);
    }
}

module.exports = {
    add,
    get,
    getSearchable,
    size,
    clear,
    seed,
};
