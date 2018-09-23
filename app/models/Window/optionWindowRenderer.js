"use strict";
const { remote } = require("electron");
const path = require("path");

const { Template } = require("../Template");

function optionWindowRenderer() {
    renderWindow();
    enableButtonListeners();
}

function renderWindow() {
    let tmpl = new Template({
        path: path.join(__dirname, "OptionWindow.hbs"),
        parent: document.getElementById("window")
    });
    let data = remote.getGlobal("options").store; // pass all known usersettings

    tmpl.render(data);
}

function enableButtonListeners() {
    document.getElementById("cancel-button").addEventListener("click", function() {
        remote.getCurrentWindow().close();
    });

    document.getElementById("save-button").addEventListener("click", function() {
        let store = remote.getGlobal("options");
        store.set({
            listeningPort: document.getElementById("listeningport").value
        });
        remote.getCurrentWindow().close();
    });
}

module.exports = optionWindowRenderer;
