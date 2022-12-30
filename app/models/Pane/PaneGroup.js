const path = require("path");
const { Template } = require("../Template");

class PaneGroup {
    constructor(parent) {
        this.parent = parent;
        this.children = [];
    }

    show() {
        const tmpl = new Template({
            path: path.join(__dirname, "PaneGroup.hbs"),
            parent: this.parent,
        });
        tmpl.render({}, () => {
            this.children.forEach((pane) => {
                const currentPane = pane;
                currentPane.parent = this.parent.querySelector(".pane-group");
                currentPane.show();
            });
        });
    }

    createSubPane(pane) {
        this.children.push(pane);
    }
}

module.exports = PaneGroup;
