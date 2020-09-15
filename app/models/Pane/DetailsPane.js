"use strict";
const { Template } = require("../Template");
const Mark = require("mark.js");
const path = require("path");

class DetailsPane {
    constructor(parent) {
        this.parent = parent;
        this.enableListeners();
    }

    show() {
        let tmpl = new Template({
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
        let container = this.getRoot();
        let codeContainer = container.querySelectorAll("pre");
        if (typeof container !== "undefined" && typeof codeContainer !== "undefined") {
            let markInst = new Mark(codeContainer);
            markInst.unmark({
                done: function () {
                    if (typeof value !== "undefined" && value !== "") {
                        markInst.mark(value, {
                            separateWordSearch: false,
                            exclude: [".key"],
                            noMatch: function () {
                                container.style.display = "none";
                            },
                            done: function () {
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
