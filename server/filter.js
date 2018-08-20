"use strict";
const { remote } = require("electron");

var filterTimer,
    filterState = false;

function filterItems(items, value) {
    if (typeof value === "undefined") {
        value = document.getElementById("filter-events").value;
    }
    if (value === "") {
        clearFilter();
    }
    // we're filtering case insensitive
    value = value.toLowerCase();

    let events = remote.getGlobal("trackedEvents");
    [].forEach.call(items, (eventEl) => {
        let index = eventEl.id.substring("events-".length - 1);
        let event = events[index];
        let match = !filterState; // when not filtering, assume matched

        // match events through the order of importance:
        // 1. event schema name
        // 2. context schema names
        // 3. event and context payload data
        try {
            if (!match) {
                match =
                    getSchemaName(event.payload)
                        .toLowerCase()
                        .indexOf(value) > -1;
            }
            if (!match) {
                for (let i = event.contexts.length - 1; i >= 0; i--) {
                    if (
                        getSchemaName(event.contexts[i])
                            .toLowerCase()
                            .indexOf(value) > -1
                    ) {
                        match = true;
                        break;
                    }
                }
            }
            if (!match) {
                // check contents of both event as well as the contexts
                let payloads = [event.payload].concat(event.contexts);
                for (let j = payloads.length - 1; j >= 0; j--) {
                    let payload = payloads[j].obj.data;
                    for (let prop in payload) {
                        if (payload.hasOwnProperty(prop)) {
                            if (
                                payload[prop]
                                    .toString()
                                    .toLowerCase()
                                    .indexOf(value) > -1
                            ) {
                                match = true;
                                break;
                            }
                        }
                    }
                    if (match) {
                        break;
                    }
                }
            }
            eventEl.style.display = match ? "" : "none";
        } catch (err) {
            console.log(err);
        }
    });
    highlight(value);
}

function getSchemaName(event) {
    return event.obj.schema.split("/")[1];
}

function filterEvents(value, keycode) {
    // go easy on the processing when user types fast,
    // only execute 100ms after last keyup
    clearTimeout(filterTimer);

    if (value === "" || typeof value === "undefined") {
        clearFilter();
    } else {
        filterState = true;
        filterTimer = setTimeout(function() {
            let eventItems = document.querySelectorAll("#events-container .list-group-item");

            // when not tapping backspace,
            // we can narrow the search
            if (keycode !== 8) {
                // faster than Array.from()
                eventItems = Array.prototype.slice
                    .call(eventItems)
                    .filter((item) => item.style.display === "");
            }
            filterItems(eventItems, value);
        }, 250);
    }
}

function clearFilter() {
    filterState = false;
    highlight("");
}

function highlight(value) {
    document.dispatchEvent(
        new CustomEvent("highlight", {
            detail: value
        })
    );
}

module.exports = {
    filterItems: filterItems,
    filterEvents: filterEvents,
    highlight: highlight,
    clearFilter: clearFilter
};
