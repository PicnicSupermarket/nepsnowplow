const { remote, ipcRenderer, BrowserWindow, Menu } = require("electron");
const os = require("os");
const appLogger = require("../../../server/logger/app_logger");
const network = require("../../../server/network_interfaces");
const filter = require("../../..//server/filter");
const { Template } = require("../Template");
const { PaneGroup, SidebarListPane, DetailsPane } = require("../Pane");

function mainWindowRenderer() {
    startServer();
    renderWindow();
}

function startServer() {
    require("../../../server/server");
}

function renderWindow() {
    let target = document.getElementById("window");
    renderHeader(target);
    renderMain(target);
    renderFooter(target);
    appLogger.displayEvents(remote.getGlobal("trackedEvents"));
}

function renderHeader(target) {
    let isWindows = os.platform() === "win32";
    let validationOn = !!remote.getGlobal("options").showSchemaValidation;

    let tmpl = new Template({
        path: __dirname + "\\headerToolbar.hbs",
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

function enableSearchListener() {
    var filterEventsInput = document.getElementById("filter-events");
    var clearFilterButton = document.getElementById("clear-filter");

    filterEventsInput.addEventListener("focus", function(e) {
        clearFilterButton.classList.add("icon-cancel-circled", "clickable");
    });

    filterEventsInput.addEventListener("blur", function(e) {
        if (this.value === "") {
            clearFilterButton.classList.remove(
                "icon-cancel-circled",
                "clickable"
            );
        }
    });

    filterEventsInput.addEventListener("keyup", function(e) {
        var value = this.value;
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

function renderMain(target) {
    let paneGroup = new PaneGroup(target);
    paneGroup.createSubPane(new SidebarListPane());
    paneGroup.createSubPane(new DetailsPane());
    paneGroup.show();
}

function renderFooter(target) {
    let tmpl = new Template({
        path: __dirname + "\\footerToolbar.hbs",
        parent: target
    });
    let data = {
        ip_address: network.currentIpAddress(),
        port: remote.getGlobal("options").listeningPort
    };
    tmpl.render(data);
}

function enableToolbarButtonListeners() {
    document
        .getElementById("reset-button")
        .addEventListener("click", function(e) {
            // remove events from memory
            ipcRenderer.send("clear-events");

            // clear events from window
            var eventsContainer = document.getElementById("events-container");
            var detailsContainer = document.getElementById("details-container");
            while (eventsContainer.firstChild) {
                eventsContainer.removeChild(eventsContainer.firstChild);
            }
            while (detailsContainer.firstChild) {
                detailsContainer.removeChild(detailsContainer.firstChild);
            }
        });

    document
        .getElementById("validation-toggle")
        .addEventListener("click", function(e) {
            let validationOn = !!remote.getGlobal("options")
                .showSchemaValidation;

            if (validationOn) {
                // was previously on
                this.classList.remove("active");
                document.body.classList.remove("show-validation");
            } else {
                this.classList.add("active");
                document.body.classList.add("show-validation");
            }
            remote.getGlobal("options").showSchemaValidation = !validationOn;
        });
}

function enableWindowButtonListeners() {
    document
        .getElementById("close-button")
        .addEventListener("click", function(e) {
            var window = remote.getCurrentWindow();
            window.close();
        });

    document
        .getElementById("min-button")
        .addEventListener("click", function(e) {
            var window = remote.getCurrentWindow();
            window.minimize();
        });

    document
        .getElementById("max-button")
        .addEventListener("click", function(e) {
            var window = remote.getCurrentWindow();
            if (!window.isMaximized()) {
                window.maximize();
            } else {
                window.unmaximize();
            }
        });
}

module.exports = mainWindowRenderer;
