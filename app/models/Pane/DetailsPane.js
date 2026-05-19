const Mark = require("mark.js");
const path = require("path");
const { Template } = require("../Template");

class DetailsPane {
    constructor(parent) {
        this.parent = parent;
        // Sentinel that can never equal a real query string, so the first
        // call always runs through `mark.js`.
        this.lastHighlightValue = null;
        this.enableListeners();
    }

    show() {
        const tmpl = new Template({
            path: path.join(__dirname, "DetailsPane.hbs"),
            parent: this.parent,
        });
        tmpl.render();
    }

    enableListeners() {
        document.addEventListener("highlight", (event) => {
            const detail = event.detail || {};
            this.highlightDetails(detail.value, detail.force);
        });
    }

    getRoot() {
        return document.getElementById("details-container");
    }

    highlightDetails(value, force) {
        // mark.js walks every `<pre>` node in the details pane on each run;
        // when the query is unchanged the result is identical to the
        // previous pass.
        if (!force && value === this.lastHighlightValue) {
            return;
        }
        this.lastHighlightValue = value;

        const container = this.getRoot();
        const codeContainer = container.querySelectorAll("pre");
        if (typeof container !== "undefined" && typeof codeContainer !== "undefined") {
            const markInst = new Mark(codeContainer);
            markInst.unmark({
                done() {
                    if (typeof value !== "undefined" && value !== "") {
                        markInst.mark(value, {
                            separateWordSearch: false,
                            exclude: [".key"],
                            noMatch() {
                                container.style.display = "none";
                            },
                            done() {
                                if (container.getElementsByTagName("mark").length > 0) {
                                    container.style.display = "";
                                }
                            },
                        });
                    } else {
                        container.style.display = "";
                    }
                },
            });
        }
    }
}

module.exports = DetailsPane;
