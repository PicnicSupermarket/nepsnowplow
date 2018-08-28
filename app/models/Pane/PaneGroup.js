"use strict";
const { Template } = require("../Template");
const path = require("path");

class PaneGroup {
    constructor(parent) {
        this.parent = parent;
        this.children = [];
    }

    show() {
        let tmpl = new Template({
            path: path.join(__dirname, "PaneGroup.hbs"),
            parent: this.parent
        });
        tmpl.render({}, () => {
            this.children.forEach((pane) => {
                pane.parent = this.parent.querySelector(".pane-group");
                pane.show();
            });
        });
    }

    createSubPane(pane) {
        this.children.push(pane);
    }
}

module.exports = PaneGroup;
