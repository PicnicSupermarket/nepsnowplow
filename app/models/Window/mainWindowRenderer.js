"use strict";

const { remote, ipcRenderer } = require("electron");
const os = require("os");
const path = require("path");

const appLogger = require("../../../server/appLogger");
const network = require("../../../server/networkInterfaces");
const filter = require("../../..//server/filter");
const { Template } = require("../Template");
const { PaneGroup, SidebarListPane, DetailsPane } = require("../Pane");

function startServer() {
    require("../../../server/server");
}

function enableSearchListener() {
    const filterEventsInput = document.getElementById("filter-events");
    const clearFilterButton = document.getElementById("clear-filter");

    filterEventsInput.addEventListener("focus", () => {
        clearFilterButton.classList.add("icon-cancel-circled", "clickable");
    });

    filterEventsInput.addEventListener("blur", (e) => {
        if (e.target.value === "") {
            clearFilterButton.classList.remove("icon-cancel-circled", "clickable");
        }
    });

    filterEventsInput.addEventListener("keyup", function(e) {
        let value = this.value;
        if (e.keyCode === 27) {
            // escape (27) was pressed
            filter.clearFilter();
            this.blur();
        } else if (e.keyCode === 13) {
            // enter(13) was pressed
            e.preventDefault();
            this.blur();
        } else {
            filter.filterEvents(value, e.keyCode);
        }
    });

    clearFilterButton.addEventListener("click", function(e) {
        this.classList.remove("icon-cancel-circled", "clickable");
        filterEventsInput.value = "";
        filter.clearFilter();
    });
}

function enableToolbarButtonListeners() {
    document.getElementById("reset-button").addEventListener("click", () => {
        // remove events from memory
        ipcRenderer.send("clear-events");

        // clear events from window
        const eventsContainer = document.getElementById("events-container");
        const detailsContainer = document.getElementById("details-container");

        while (eventsContainer.firstChild) {
            eventsContainer.removeChild(eventsContainer.firstChild);
        }
        while (detailsContainer.firstChild) {
            detailsContainer.removeChild(detailsContainer.firstChild);
        }
    });

    document.getElementById("validation-toggle").addEventListener("click", (e) => {
        let validationOn = !!remote.getGlobal("options").showSchemaValidation;

        if (validationOn) {
            // was previously on
            e.target.classList.remove("active");
            document.body.classList.remove("show-validation");
        } else {
            e.target.classList.add("active");
            document.body.classList.add("show-validation");
        }
        remote.getGlobal("options").showSchemaValidation = !validationOn;
    });
}

function enableWindowButtonListeners() {
    document.getElementById("close-button").addEventListener("click", () => {
        remote.getCurrentWindow().close();
    });

    document.getElementById("min-button").addEventListener("click", () => {
        remote.getCurrentWindow().minimize();
    });

    document.getElementById("max-button").addEventListener("click", () => {
        let window = remote.getCurrentWindow();
        if (!window.isMaximized()) {
            window.maximize();
        } else {
            window.unmaximize();
        }
    });
}

function renderHeader(target) {
    let isWindows = os.platform() === "win32";
    let validationOn = !!remote.getGlobal("options").showSchemaValidation;

    let tmpl = new Template({
        path: path.join(__dirname, "HeaderToolbar.hbs"),
        parent: target
    });
    let data = {
        title: "NepSnowplow",
        isWindows: isWindows,
        validationOn: validationOn
    };
    tmpl.render(
        data,
        () => {
            if (isWindows) enableWindowButtonListeners();
            enableToolbarButtonListeners();
            enableSearchListener();
        },
        false
    );

    if (validationOn) {
        document.body.classList.add("show-validation");
    }
}

function renderMain(target) {
    let paneGroup = new PaneGroup(target);
    paneGroup.createSubPane(new SidebarListPane());
    paneGroup.createSubPane(new DetailsPane());
    paneGroup.show();
}

function renderFooter(target) {
    let tmpl = new Template({
        path: path.join(__dirname, "FooterToolbar.hbs"),
        parent: target
    });
    let data = {
        ipAddress: network.currentIpAddress(),
        port: remote.getGlobal("options").listeningPort
    };
    tmpl.render(data);
}

function renderWindow() {
    let target = document.getElementById("window");
    renderHeader(target);
    renderMain(target);
    renderFooter(target);
    appLogger.displayEvents(remote.getGlobal("trackedEvents"));
}

function mainWindowRenderer() {
    startServer();
    renderWindow();
}

module.exports = mainWindowRenderer;
