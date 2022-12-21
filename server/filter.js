const remote = require("@electron/remote");
const { debounce, Logger } = require("./utils");

let filterQuery = "";
let filterValidEvents = false;

function contains(haystack, needle) {
    try {
        return haystack?.toString().toLowerCase().indexOf(needle) > -1;
    } catch (err) {
        Logger.info("Unable to parse haystack, assume needle", needle, "not in haystack", haystack);
        Logger.error(err);
        return false;
    }
}

function getSchemaName(event) {
    return event.obj.schema?.split("/")[1];
}

function highlight(value) {
    document.dispatchEvent(
        new CustomEvent("highlight", {
            detail: value,
        })
    );
}

function filterItems() {
    const eventItems = document.querySelectorAll("#events-container .list-group-item");
    const events = remote.getGlobal("trackedEvents");

    Array.from(eventItems).forEach((eventEl) => {
        const index = eventEl.id.substring("events-".length - 1);
        const event = events[index];
        let match = !filterQuery; // when not filtering, assume matched

        // match events through the order of importance:
        // 1. event schema name
        // 2. context schema names
        // 3. event and context payload data
        try {
            match = match || contains(getSchemaName(event.payload), filterQuery);
            for (let i = event.contexts.length - 1; !match && i >= 0; i -= 1) {
                match = match || contains(getSchemaName(event.contexts[i]), filterQuery);
            }
            if (!match) {
                // check contents of both event as well as the contexts
                const payloads = [event.payload].concat(event.contexts);
                payloads.forEach((item) => {
                    const payload = item.obj.data;
                    const query = filterQuery;
                    Object.keys(payload).forEach((prop) => {
                        if (
                            Object.prototype.hasOwnProperty.call(payload, prop) &&
                            contains(payload[prop], query)
                        ) {
                            match = true;
                        }
                    });
                });
            }

            if (filterValidEvents) {
                match = match && !event.isValid;
            }

            eventEl.style.display = match ? "block" : "none";
        } catch (err) {
            Logger.error(err);
        }
    });
    highlight(filterQuery);
}

const update = debounce(filterItems, 50);

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
