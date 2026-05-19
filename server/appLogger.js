const { ipcRenderer } = require("electron");
const renderjson = require("renderjson");
const { Event } = require("../app/models/Event");
const eventStore = require("./eventStore");

renderjson.set_show_to_level("all");
renderjson.set_icons("+", "-");

function displayEvent(event, index) {
    const eventItem = new Event(event, index);
    eventItem.logItem();
}

function displayEvents(events) {
    events.forEach((event, index) => {
        displayEvent(event, index);
    });
}

function logEvent(event) {
    // Add to the renderer-local store first so the index and any subsequent
    // filter/render work doesn't depend on a synchronous IPC round-trip to
    // main. The mirror to main is fire-and-forget for persistence only.
    const index = eventStore.add(event);
    ipcRenderer.send("add-event", event);

    displayEvent(event, index);
}

module.exports = {
    logEvent,
    displayEvent,
    displayEvents,
};
