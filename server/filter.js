"use strict";
const remote = require("@electron/remote");
const { debounce } = require("./utils");
var filterQuery = "",
    filterValidEvents = false;

var update = debounce(filterItems, 50);

function filterItems() {
    const eventItems = document.querySelectorAll("#events-container .list-group-item");
    const events = remote.getGlobal("trackedEvents");

    Array.from(eventItems).forEach((eventEl) => {
        const index = eventEl.id.substring("events-".length - 1);
        const event = events[index];
        var match = !filterQuery; // when not filtering, assume matched

        // match events through the order of importance:
        // 1. event schema name
        // 2. context schema names
        // 3. event and context payload data
        try {
            match = match || contains(getSchemaName(event.payload), filterQuery);
            for (let i = event.contexts.length - 1; !match && i >= 0; i--) {
                match = match || contains(getSchemaName(event.contexts[i]), filterQuery);
            }
            if (!match) {
                // check contents of both event as well as the contexts
                const payloads = [event.payload].concat(event.contexts);
                for (let j = payloads.length - 1; !match && j >= 0; j--) {
                    const payload = payloads[j].obj.data;
                    for (let prop in payload) {
                        if (payload.hasOwnProperty(prop) && contains(payload[prop], filterQuery)) {
                            match = true;
                            break;
                        }
                    }
                }
            }

            if (filterValidEvents) {
                match = match && !event.isValid;
            }

            eventEl.style.display = match ? "block" : "none";
        } catch (err) {
            console.log(err);
        }
    });
    highlight(filterQuery);
}

function getSchemaName(event) {
    return event.obj.schema?.split("/")[1];
}

function contains(haystack, needle) {
    try {
        return haystack?.toString().toLowerCase().indexOf(needle) > -1;
    } catch (err) {
        console.log("Unable to parse haystack, assume needle", needle, "not in haystack", haystack);
        console.log(err);
        return false;
    }
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

function highlight(value) {
    document.dispatchEvent(
        new CustomEvent("highlight", {
            detail: value,
        })
    );
}

module.exports = {
    update: update,
    setSearchQuery: setSearchQuery,
    setFilterValidEvents: setFilterValidEvents,
    clearSearchQuery: clearSearchQuery,
};
