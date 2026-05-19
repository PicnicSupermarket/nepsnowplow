const { ipcRenderer } = require("electron");
const remote = require("@electron/remote");
const os = require("os");
const path = require("path");
const network = require("network");

const appLogger = require("../../../server/appLogger");
const eventStore = require("../../../server/eventStore");
const filter = require("../../../server/filter");
const { Template } = require("../Template");
const { PaneGroup, SidebarListPane, DetailsPane } = require("../Pane");
const Server = require("../../../server/Server");

const server = new Server();
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
        const { value } = e.target;
        if (e.key === "Escape") {
            filter.clearSearchQuery();
            e.currentTarget.blur();
        } else if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
        } else {
            filter.setSearchQuery(value);
        }
    });

    clearFilterButton.addEventListener("click", (e) => {
        e.currentTarget.classList.remove("icon-cancel-circled", "clickable");
        filterEventsInput.value = "";
        filter.clearSearchQuery();
    });
}

function enableToolbarButtonListeners() {
    document.getElementById("reset-button").addEventListener("click", () => {
        // remove events from memory
        ipcRenderer.send("clear-events");
        eventStore.clear();
        appLogger.reset();
        server.resetEvents();

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

    document.getElementById("validation-filter").addEventListener("click", (e) => {
        const filterValidEvents = !remote.getGlobal("options").filterValidEvents ?? true;

        if (filterValidEvents) {
            e.currentTarget.classList.add("active");
        } else {
            e.currentTarget.classList.remove("active");
        }

        remote.getGlobal("options").filterValidEvents = filterValidEvents;
        filter.setFilterValidEvents(filterValidEvents);
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
        const window = remote.getCurrentWindow();
        if (!window.isMaximized()) {
            window.maximize();
        } else {
            window.unmaximize();
        }
    });
}

function scrollIntoView(elem, relativeTo) {
    const pos = elem.offsetTop;
    const top =
        typeof relativeTo !== "undefined" ? relativeTo.scrollTop : elem.parentNode.scrollTop;
    const bottom = top + relativeTo.offsetHeight;
    if (pos > bottom) {
        elem.scrollIntoView(false);
    } else if (pos < top) {
        elem.scrollIntoView(true);
    }
}

function enableKeyListeners() {
    document.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") {
            return;
        }
        // prevent regular scrolling behaviour
        e.preventDefault();

        // Get all events in view.
        // Not the same as all stored events, because we might be filtering.
        const events = Array.from(document.querySelectorAll("#events-container li")).filter(
            (elem) => elem.style.display !== "none"
        );
        if (events.length === 0) {
            return;
        }

        // The current selection may not exist yet (no event has been clicked
        // since startup) or may be filtered out of view; in either case fall
        // back to a sensible end of the visible list rather than dereferencing
        // a missing element.
        const selectedEl = document.querySelector("#events-container li.selected");
        const currentIndex = selectedEl
            ? events.findIndex((elem) => elem.id === selectedEl.id)
            : -1;

        let targetIndex;
        if (currentIndex === -1) {
            targetIndex = e.key === "ArrowDown" ? 0 : events.length - 1;
        } else {
            targetIndex = e.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
        }

        if (targetIndex >= 0 && targetIndex < events.length) {
            const event = events[targetIndex];
            event.click();
            scrollIntoView(event, event.parentNode.parentNode);
        }
    });
}

function renderHeader(target) {
    const isWindows = os.platform() === "win32";
    const filterValidEvents = !!remote.getGlobal("options").filterValidEvents;

    const tmpl = new Template({
        path: path.join(__dirname, "HeaderToolbar.hbs"),
        parent: target,
    });
    const data = {
        title: "NepperSnowplow",
        isWindows,
        filterValidEvents,
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

    document.body.classList.add("show-validation");
}

function renderMain(target) {
    const paneGroup = new PaneGroup(target);
    paneGroup.createSubPane(new SidebarListPane());
    paneGroup.createSubPane(new DetailsPane());
    paneGroup.show();
}

function renderFooter(target, ip, port) {
    const tmpl = new Template({
        path: path.join(__dirname, "FooterToolbar.hbs"),
        parent: target,
    });
    const data = {
        ipAddress: ip || "...",
        port: port || "...",
    };
    tmpl.render(data);
}

function updateFooter(target) {
    server.getInstance().on("ready", (port) => {
        network.get_active_interface((err, iface) => {
            const footer = document.getElementById("footer");
            footer.parentNode.removeChild(footer);

            renderFooter(target, iface.ip_address, port);
        });
    });
}

function renderWindow() {
    // Pre-warm every .hbs under app/models/ so the first event render
    // (and the header/footer/pane renders below) hit a warm Handlebars
    // cache instead of paying synchronous fs.readFileSync on the
    // renderer thread. Cheap (~7 small files) and one-shot at startup.
    Template.precompileDir(path.join(__dirname, ".."));

    const target = document.getElementById("window");
    renderHeader(target);
    renderMain(target);
    renderFooter(target);
    updateFooter(target);
    // Seed the renderer-local store from main's mirror so events survive a
    // window reload, then render them. After this point all reads go through
    // the local store and avoid synchronous IPC. `displayEvents` owns the
    // seed so oversized restores share the FIFO-eviction path with live
    // traffic.
    if (eventStore.size() === 0) {
        appLogger.displayEvents(remote.getGlobal("trackedEvents"));
    }
}

function mainWindowRenderer() {
    renderWindow();
}

module.exports = mainWindowRenderer;
