// Renderer-local store for tracked events.
//
// History: the renderer used to ask the main process for `trackedEvents` via
// `@electron/remote`'s `getGlobal`, which is a synchronous IPC round-trip.
// That call sat on the hot path for every event insert and every keystroke in
// the filter, so the renderer would stall under bursty traffic. The renderer
// is the only consumer of `trackedEvents` for display/filtering purposes, so
// we keep an authoritative copy here and mirror writes to main asynchronously
// for persistence across reloads.
//
// The store is capped (FIFO) so an app left running for hours doesn't grow
// the in-memory event list and DOM unboundedly. Indices are stable: when an
// event is evicted from the head, the surviving events keep the index they
// were assigned, and `baseIndex` tracks the index of the oldest live entry.
// That way the DOM `id="event-${index}"`, the view-model `Map` key, and the
// store all agree without having to renumber the DOM on every eviction.

// Soft cap shared by the renderer-local store and the main-process mirror
// (`global.trackedEvents`). Picked to be comfortably above typical session
// volume while bounding worst-case memory and DOM size. Both processes
// import this so they evict in lockstep.
const MAX_EVENTS = 5000;

let baseIndex = 0;
const events = [];
const searchableEntries = [];

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

// Returns `{ index, evictedIndex }`. `index` is the stable identifier the
// caller should use everywhere (DOM id, view-model map key). `evictedIndex`
// is the index of the entry that fell off the head, or `null` if the store
// hadn't reached the cap yet. Callers are expected to mirror that eviction
// in any DOM/view-model state they own.
function add(event) {
    events.push(event);
    searchableEntries.push(buildSearchable(event));
    const index = baseIndex + events.length - 1;

    let evictedIndex = null;
    if (events.length > MAX_EVENTS) {
        events.shift();
        searchableEntries.shift();
        evictedIndex = baseIndex;
        baseIndex += 1;
    }

    return { index, evictedIndex };
}

function indexToOffset(index) {
    return index - baseIndex;
}

function get(index) {
    const offset = indexToOffset(index);
    if (offset < 0 || offset >= events.length) {
        return undefined;
    }
    return events[offset];
}

function getSearchable(index) {
    const offset = indexToOffset(index);
    if (offset < 0 || offset >= events.length) {
        return undefined;
    }
    return searchableEntries[offset];
}

function size() {
    return events.length;
}

function clear() {
    events.length = 0;
    searchableEntries.length = 0;
    baseIndex = 0;
}

module.exports = {
    MAX_EVENTS,
    add,
    get,
    getSearchable,
    size,
    clear,
};
