"use strict";
const { Template } = require("../Template");
const Mark = require("mark.js");

class SidebarListPane {
    constructor(parent) {
        this.parent = parent;
        this.enableListeners();
    }

    show() {
        let tmpl = new Template({
            path: __dirname + "\\SidebarListPane.hbs",
            parent: this.parent
        });
        tmpl.render();
    }

    enableListeners() {
        document.addEventListener("highlight", (event) => {
            this.highlightEvents(event.detail);
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
