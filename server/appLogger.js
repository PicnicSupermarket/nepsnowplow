"use strict";

const { remote } = require("electron");
const { Event } = require("../app/models/Event");

const renderjson = require("renderjson");
renderjson.set_show_to_level("all");
renderjson.set_icons("+", "-");

function displayEvent(event, index) {
    let eventItem = new Event(event, index);
    eventItem.logItem();
}

function displayEvents(events) {
    events.forEach((event, index) => {
        displayEvent(event, index);
    });
}

function logEvent(event) {
    let ipcRenderer = require("electron").ipcRenderer;
    ipcRenderer.send("add-event", event);

    let index = remote.getGlobal("trackedEvents").length - 1;
    displayEvent(event, index);
}

module.exports = {
    logEvent: logEvent,
    displayEvent: displayEvent,
    displayEvents: displayEvents
};
