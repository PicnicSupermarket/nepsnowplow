"use strict";
const { BrowserWindow } = require("electron");

class Tutorial {
    constructor(parent) {
        this.window = new BrowserWindow({
            width: 1630,
            height: 1024,
            parent: parent,
            modal: true
        });
        this.on("close", () => {
            this.window = null;
        });
        this.window.loadFile("app/tutorial.html");
    }

    show() {
        this.window.show();
    }
}
