const Mark = require("mark.js");
const path = require("path");
const { Template } = require("../Template");

class SidebarListPane {
    constructor(parent) {
        this.parent = parent;
        this.enableListeners();
    }

    show() {
        const tmpl = new Template({
            path: path.join(__dirname, "SidebarListPane.hbs"),
            parent: this.parent,
        });
        tmpl.render();
    }

    enableListeners() {
        document.addEventListener("highlight", (event) => {
            this.highlightEvents(event.detail);
        });
    }

    highlightEvents(value) {
        const markInst = new Mark(document.querySelectorAll("#events-container .schema-name"));
        markInst.unmark({
            done() {
                if (typeof value !== "undefined" && value !== "") {
                    markInst.mark(value, {
                        separateWordSearch: false,
                    });
                }
            },
        });
    }
}

module.exports = SidebarListPane;
