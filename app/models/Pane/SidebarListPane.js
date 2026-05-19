const Mark = require("mark.js");
const path = require("path");
const { Template } = require("../Template");

class SidebarListPane {
    constructor(parent) {
        this.parent = parent;
        // Sentinel that can never equal a real query string, so the first
        // call always runs through `mark.js`.
        this.lastHighlightValue = null;
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
            const detail = event.detail || {};
            this.highlightEvents(detail.value, detail.force);
        });
    }

    highlightEvents(value, force) {
        // mark.js scans every `.schema-name` node on each run; when the query
        // is unchanged and no new items were appended to the sidebar, the
        // result is identical to the previous pass.
        if (!force && value === this.lastHighlightValue) {
            return;
        }
        this.lastHighlightValue = value;

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
