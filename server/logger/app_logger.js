const { BrowserWindow } = require("electron");
const sortObject = require("../sort_object.js");

function displayEvents(events) {
    events.forEach((event, index) => {
        displayEvent(event, index);
    });
}

function displayEvent(event, index) {
    BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send("log-event", event, index);
    });
}

function logEvent(event) {
    let length = global.trackedEvents.push(event);
    displayEvent(event, length - 1);
}

module.exports = {
    logEvent: logEvent,
    displayEvent: displayEvent,
    displayEvents: displayEvents
};
