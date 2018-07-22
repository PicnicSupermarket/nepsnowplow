"use strict";
const { ipcRenderer } = require("electron");
const { Template } = require("../Template");
const { Event } = require("../Event");
const Mark = require("mark.js");
const path = require("path");

class SidebarListPane {
    constructor(parent) {
        this.parent = parent;
        this.enableListeners();
    }

    show() {
        let tmpl = new Template({
            path: path.join(__dirname, "SidebarListPane.hbs"),
            parent: this.parent
        });
        tmpl.render();
    }

    enableListeners() {
        ipcRenderer.on("log-event", (event, spEvent, index) => {
            let eventItem = new Event(spEvent, index);
            eventItem.logItem();
        });

        ipcRenderer.on("filter-events", (event, filterMap) => {
            this.filterEvents(filterMap);
        });

        ipcRenderer.on("highlight", (event, value) => {
            this.highlightEvents(value);
        });
    }

    filterEvents(filterMap) {
        let eventItems = document.querySelectorAll(
            "#events-container .list-group-item"
        );
        eventItems.forEach((item, idx) => {
            // when undefined, fallback to showing the event
            item.style.display = !!!filterMap[
                item.id.substring("event-").length
            ]
                ? "none"
                : "";
        });
    }

    highlightEvents(value) {
        var markInst = new Mark(
            document.querySelectorAll("#events-container .schema-name")
        );
        markInst.unmark({
            done: function() {
                if (typeof value !== "undefined" && value !== "") {
                    markInst.mark(value, {
                        separateWordSearch: false
                    });
                } else {
                    var eventItems = document.querySelectorAll(
                        "#events-container .list-group-item"
                    );
                    [].forEach.call(eventItems, function(eventEl) {
                        eventEl.style.display = "";
                    });
                }
            }
        });
    }
}

module.exports = SidebarListPane;
