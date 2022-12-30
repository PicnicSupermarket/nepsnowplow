const Mark = require("mark.js");
const path = require("path");
const { Template } = require("../Template");

class DetailsPane {
    constructor(parent) {
        this.parent = parent;
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
            this.highlightDetails(event.detail);
        });
    }

    getRoot() {
        return document.getElementById("details-container");
    }

    highlightDetails(value) {
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
