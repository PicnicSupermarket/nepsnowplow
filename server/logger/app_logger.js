const { remote } = require("electron");
const sortObject = require("../sort_object.js");
const filter = require("../filter.js");
const { Event } = require("../../app/models/Event");

const renderjson = require("renderjson");
renderjson.set_show_to_level("all");
renderjson.set_icons("+", "-");

function displayEvents(events) {
    events.forEach((event, index) => {
        displayEvent(event, index);
    });
}

function displayEvent(event, index) {
    let eventItem = new Event(event, index);
    eventItem.logItem();
}

function logEvent(event) {
    var ipcRenderer = require("electron").ipcRenderer;
    ipcRenderer.send("add-event", event);

    var index = remote.getGlobal("trackedEvents").length - 1;
    displayEvent(event, index);
}

module.exports = {
    logEvent: logEvent,
    displayEvent: displayEvent,
    displayEvents: displayEvents
};
