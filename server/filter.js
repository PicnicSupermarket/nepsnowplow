const { debounce, Logger } = require("./utils");
const eventStore = require("./eventStore");

let filterQuery = "";
let filterValidEvents = false;
// Sticky across debounce coalescing: if any caller in the current debounce
// window asks to force a re-highlight (e.g. new items were appended to the
// sidebar), the eventual `filterItems` pass must honour it even if a later,
// non-forced `update()` call "won" the debounce.
let forceNextHighlight = false;

function highlight(value, force) {
    document.dispatchEvent(
        new CustomEvent("highlight", {
            detail: { value, force },
        })
    );
}

function filterItems() {
    const eventItems = document.querySelectorAll("#events-container .list-group-item");

    for (let i = 0; i < eventItems.length; i += 1) {
        const eventEl = eventItems[i];
        const index = Number(eventEl.id.substring("event-".length));
        const event = eventStore.get(index);

        if (!event) {
            // No matching entry in the local store; leave the DOM node alone.
        } else {
            let match = true;

            try {
                if (filterQuery) {
                    const searchable = eventStore.getSearchable(index);
                    match = typeof searchable === "string" && searchable.indexOf(filterQuery) > -1;
                }

                if (match && filterValidEvents) {
                    match = !event.isValid;
                }

                // Only touch the DOM when visibility actually changes — writing
                // to `style.display` unconditionally on every keystroke forces
                // layout even for items that didn't change.
                const desired = match ? "block" : "none";
                if (eventEl.style.display !== desired) {
                    eventEl.style.display = desired;
                }
            } catch (err) {
                Logger.error(err);
            }
        }
    }

    const force = forceNextHighlight;
    forceNextHighlight = false;
    highlight(filterQuery, force);
}

// 50ms was tight enough that successive keystrokes overlapped with the
// previous filter pass; 150ms keeps the UI responsive while letting bursts
// coalesce.
const debouncedFilterItems = debounce(filterItems, 150);

function update(options) {
    if (options && options.force) {
        forceNextHighlight = true;
    }
    debouncedFilterItems();
}

function setFilterValidEvents(filterEvents) {
    filterValidEvents = filterEvents;
    update();
}

function setSearchQuery(query) {
    filterQuery = query.toLowerCase();
    update();
}

function clearSearchQuery() {
    filterQuery = "";
    update();
}

module.exports = {
    update,
    setSearchQuery,
    setFilterValidEvents,
    clearSearchQuery,
};
