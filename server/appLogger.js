const { ipcRenderer } = require("electron");
const renderjson = require("renderjson");
const { Event } = require("../app/models/Event");
const eventStore = require("./eventStore");
const filter = require("./filter");

renderjson.set_show_to_level("all");
renderjson.set_icons("+", "-");

// View-model lookup for the delegated click handler. We need to keep the
// `Event` instances alive (not just the underlying raw events in
// `eventStore`) because `showDetails` depends on the constructed `Context`
// objects and the validation state attached to the view-model.
const viewModelsByIndex = new Map();

// Inserts queued between microtask flushes. Bursty traffic (a Snowplow
// bundle, or the renderer's reload-time seed) ends up as one DOM write and
// one filter pass instead of one per event.
const pendingViewModels = [];
let flushScheduled = false;
let delegatedClickAttached = false;

function ensureDelegatedClickHandler(container) {
    if (delegatedClickAttached) {
        return;
    }
    delegatedClickAttached = true;
    container.addEventListener("click", (e) => {
        const itemEl = e.target.closest("li.list-group-item");
        if (!itemEl || !container.contains(itemEl)) {
            return;
        }
        const { id } = itemEl;
        if (!id.startsWith("event-")) {
            return;
        }
        const index = Number(id.substring("event-".length));
        const view = viewModelsByIndex.get(index);
        if (view) {
            view.showDetails(itemEl);
        }
    });
}

// Drop everything we know about an evicted event so its DOM node, view-model,
// and any not-yet-flushed pending entry all disappear together. Called from
// `logEvent`/`displayEvents` whenever `eventStore.add` reports the head was
// trimmed by the FIFO cap.
function evictFromUi(evictedIndex) {
    viewModelsByIndex.delete(evictedIndex);

    // A burst large enough to overflow the cap in a single flush window
    // (e.g. the reload-time seed of a long-running session) can evict
    // entries that never reached the DOM. Strip those from the pending
    // queue so we don't render rows whose backing store entry is already
    // gone.
    const stillPendingAt = pendingViewModels.findIndex((v) => v.index === evictedIndex);
    if (stillPendingAt !== -1) {
        pendingViewModels.splice(stillPendingAt, 1);
        return;
    }

    const el = document.getElementById(`event-${evictedIndex}`);
    if (el && el.parentNode) {
        el.parentNode.removeChild(el);
    }
}

function flushPending() {
    flushScheduled = false;
    if (pendingViewModels.length === 0) {
        return;
    }

    const container = document.getElementById("events-container");
    if (!container) {
        // The sidebar pane hasn't mounted yet. Leave the queue intact so a
        // later flush (after `renderMain`) picks it up.
        return;
    }

    // Drain in one shot so any view-models queued during DOM work end up in
    // the next batch rather than being lost or double-rendered.
    const batch = pendingViewModels.splice(0, pendingViewModels.length);

    let html = "";
    for (let i = 0; i < batch.length; i += 1) {
        const view = batch[i];
        viewModelsByIndex.set(view.index, view);
        html += view.logItemHtml();
    }

    ensureDelegatedClickHandler(container);
    container.insertAdjacentHTML("beforeend", html);

    // List items render hidden by default; one filter pass per batch flips
    // visibility for everything that matches the current query. `force: true`
    // ensures `mark.js` re-scans the sidebar so freshly inserted
    // `.schema-name` nodes get highlighted under an active query — the
    // highlight panes otherwise cache by query value and skip identical
    // runs.
    filter.update({ force: true });
}

function scheduleFlush() {
    if (flushScheduled) {
        return;
    }
    flushScheduled = true;
    queueMicrotask(flushPending);
}

function queueDisplay(rawEvent, index) {
    pendingViewModels.push(new Event(rawEvent, index));
}

// Seeds the renderer-local store from the main-process mirror and renders the
// resulting list. Owning the seed here (rather than seeding the store
// separately in the window renderer) means oversized seeds go through the
// same FIFO-eviction path as live events and indices always match what the
// store assigned.
function displayEvents(events) {
    if (!Array.isArray(events) || events.length === 0) {
        return;
    }
    for (let i = 0; i < events.length; i += 1) {
        const { index, evictedIndex } = eventStore.add(events[i]);
        if (evictedIndex !== null) {
            evictFromUi(evictedIndex);
        }
        queueDisplay(events[i], index);
    }
    // Flush synchronously for the seed path so the initial list is on screen
    // before any subsequent code reads from the DOM.
    flushPending();
}

function logEvent(rawEvent) {
    // Add to the renderer-local store first so the index and any subsequent
    // filter/render work doesn't depend on a synchronous IPC round-trip to
    // main. The mirror to main is fire-and-forget for persistence only.
    const { index, evictedIndex } = eventStore.add(rawEvent);
    ipcRenderer.send("add-event", rawEvent);

    if (evictedIndex !== null) {
        evictFromUi(evictedIndex);
    }

    queueDisplay(rawEvent, index);
    scheduleFlush();
}

function reset() {
    // Caller is responsible for clearing the DOM and the underlying
    // `eventStore`; this just drops state owned by appLogger so a pending
    // microtask flush after reset can't resurrect evicted events.
    viewModelsByIndex.clear();
    pendingViewModels.length = 0;
    flushScheduled = false;
}

module.exports = {
    logEvent,
    displayEvents,
    reset,
};
