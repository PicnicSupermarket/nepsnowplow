const { ipcMain } = require("electron");

var filterTimer,
    filterState = false;

function filterItems(items, value) {
    if (value === "") {
        clearFilter();
    }

    let filterMap = {};
    [].forEach.call(items, (event, idx) => {
        let match = !filterState; // when not filtering, assume matched

        // match events through the order of importance:
        // 1. event schema name
        // 2. context schema names
        // 3. event and context payload data
        try {
            if (!match) {
                match =
                    event
                        .getSchemaName()
                        .toLowerCase()
                        .indexOf(value) > -1;
            }
            if (!match) {
                for (let i = event.contexts.length - 1; i >= 0; i--) {
                    if (
                        event.contexts[i]
                            .getSchemaName()
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
                    if (match) break;
                }
            }
            filterMap[idx] = match;
        } catch (err) {
            console.log(err);
        }
    });
    return filterMap;
}

function filterEvent(event, value, index) {
    let filterMap = filterItems(global.trackedEvents[index], value);
    event.sender.send("filter-events", filterMap);
    event.sender.send("highlight", value);
}

function filterEvents(event, value, keyCode) {
    // go easy on the processing when user types fast,
    // only execute 50ms after last keyup
    clearTimeout(filterTimer);
    if (value === "" || typeof value === "undefined") {
        clearFilter(event);
    } else {
        filterState = true;
        filterTimer = setTimeout(function() {
            let filterMap = filterItems(global.trackedEvents, value);
            event.sender.send("filter-events", filterMap);
            event.sender.send("highlight", value);
        }, 50);
    }
}

function getSchemaName(event) {
    return event.obj.schema.split("/")[1];
}

function clearFilter(event) {
    filterState = false;
    event.sender.send("highlight", "");
}

module.exports = {
    filterEvent: filterEvent,
    filterEvents: filterEvents,
    clearFilter: clearFilter
};
