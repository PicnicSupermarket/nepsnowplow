"use strict";

const { remote, ipcRenderer } = require("electron");
const os = require("os");
const path = require("path");
const network = require("network");

const appLogger = require("../../../server/appLogger");
const filter = require("../../..//server/filter");
const { Template } = require("../Template");
const { PaneGroup, SidebarListPane, DetailsPane } = require("../Pane");
const Server = require("../../../server/Server");

var server = new Server();
server.start();

function enableSearchListener() {
    const filterEventsInput = document.getElementById("filter-events");
    const clearFilterButton = document.getElementById("clear-filter");

    filterEventsInput.addEventListener("focus", () => {
        clearFilterButton.classList.add("icon-cancel-circled", "clickable");
    });

    filterEventsInput.addEventListener("blur", (e) => {
        if (e.currentTarget.value === "") {
            clearFilterButton.classList.remove("icon-cancel-circled", "clickable");
        }
    });

    filterEventsInput.addEventListener("keyup", (e) => {
        let value = e.target.value;
        if (e.key === "Escape") {
            filter.clearFilter();
            e.currentTarget.blur();
        } else if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
        } else {
            filter.filterEvents(value, e.key);
        }
    });

    clearFilterButton.addEventListener("click", (e) => {
        e.currentTarget.classList.remove("icon-cancel-circled", "clickable");
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
            e.currentTarget.classList.remove("active");
            document.body.classList.remove("show-validation");
        } else {
            e.currentTarget.classList.add("active");
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

function scrollIntoView(elem, relativeTo) {
    let pos = elem.offsetTop;
    let top = typeof relativeTo !== "undefined" ? relativeTo.scrollTop : elem.parentNode.scrollTop;
    let bottom = top + relativeTo.offsetHeight;
    if (pos > bottom) {
        elem.scrollIntoView(false);
    } else if (pos < top) {
        elem.scrollIntoView(true);
    }
}

function enableKeyListeners() {
    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            // prevent regular scrolling behaviour
            e.preventDefault();

            let eventId = document.querySelector("#events-container li.selected").id;

            // Get all events in view.
            // Not the same as all stored events, because we might be filtering.
            let events = Array.from(document.querySelectorAll("#events-container li")).filter(
                (elem) => elem.style.display !== "none"
            );
            let index = events.findIndex((elem) => elem.id === eventId);
            let targetIndex = e.key === "ArrowUp" ? index - 1 : index + 1;

            if (targetIndex >= 0 && targetIndex < events.length) {
                let event = events[targetIndex];
                event.click();
                scrollIntoView(event, event.parentNode.parentNode);
            }
        }
    });
}

function renderHeader(target) {
    let isWindows = os.platform() === "win32";
    let validationOn = !!remote.getGlobal("options").showSchemaValidation;

    let tmpl = new Template({
        path: path.join(__dirname, "HeaderToolbar.hbs"),
        parent: target,
    });
    let data = {
        title: "NepSnowplow",
        isWindows: isWindows,
        validationOn: validationOn,
    };
    tmpl.render(
        data,
        () => {
            if (isWindows) {
                enableWindowButtonListeners();
            }
            enableToolbarButtonListeners();
            enableSearchListener();
            enableKeyListeners();
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

function renderFooter(target, ip, port) {
    let tmpl = new Template({
        path: path.join(__dirname, "FooterToolbar.hbs"),
        parent: target,
    });
    let data = {
        ipAddress: ip || "...",
        port: port || "...",
    };
    tmpl.render(data);
}

function updateFooter(target) {
    server.getInstance().on("ready", (port) => {
        network.get_active_interface((err, iface) => {
            let footer = document.getElementById("footer");
            footer.parentNode.removeChild(footer);

            renderFooter(target, iface.ip_address, port);
        });
    });
}

function renderWindow() {
    let target = document.getElementById("window");
    renderHeader(target);
    renderMain(target);
    renderFooter(target);
    updateFooter(target);
    appLogger.displayEvents(remote.getGlobal("trackedEvents"));
}

function mainWindowRenderer() {
    renderWindow();
}

module.exports = mainWindowRenderer;
