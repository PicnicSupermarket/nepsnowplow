const remote = require("@electron/remote/main");
const logger = require("electron-log");
const { app, ipcMain, BrowserWindow, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");

try {
    require("electron-reloader")(module);
} catch (_) {
    // Nothing should happen.
}

const os = require("os");
const fs = require("fs");
const path = require("path");

remote.initialize();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

function loadOptions() {
    const defaults = {
        listeningPort: 3000,
    };
    let userOptions = {};
    try {
        // in production, remove app.asar from the path
        // cannot use process.resourcesPath in development,
        // as that will point to electron/dist in node_modules
        const resourcesPath = app.getAppPath().replace("app.asar", "");
        userOptions = JSON.parse(
            fs.readFileSync(path.resolve(resourcesPath, "settings.json"), "utf-8")
        );
    } catch (err) {
        // catch in case the file could not be resolved,
        // e.g. when somebody deleted the settings file
        logger.info(err);
    }
    return Object.assign(defaults, userOptions);
}

function createMainWindow() {
    const isWindows = os.platform() === "win32";
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 1024,
        minHeight: 768,
        acceptFirstMouse: true,
        title: "NepSnowplow",
        titleBarStyle: "hidden",
        frame: !isWindows,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "app", "index.html"));

    remote.enable(mainWindow.webContents);

    const template = [
        {
            label: "NepSnowplow",
            submenu: [
                {
                    label: "Quit",
                    accelerator: "Command+Q",
                    click() {
                        app.quit();
                    },
                },
            ],
        },
        {
            label: "Debug",
            submenu: [
                {
                    label: "Open debug panel",
                    accelerator: "CmdOrCtrl+D",
                    click() {
                        mainWindow.openDevTools();
                    },
                },
            ],
        },
        {
            label: "Edit",
            submenu: [
                { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
                { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
                { type: "separator" },
                { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
                { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
                { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // Emitted when the window is closed.
    mainWindow.on("closed", () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}

// Enable logging.
autoUpdater.logger = logger;
autoUpdater.logger.transports.file.level = "info";
logger.info("App starting...");

// Define globals.
global.trackedEvents = [];
global.options = loadOptions();

// Register custom event listeners.
ipcMain.on("add-event", (event, spEvent) => {
    global.trackedEvents.push(spEvent);
});

ipcMain.on("clear-events", () => {
    global.trackedEvents = [];
});

// Register window listeners.
app.on("window-all-closed", () => {
    // Quit when all windows are closed.
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    // if (process.platform != 'darwin') {
    app.quit();
    // }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createMainWindow();
    }
});

// Register updater listeners.
autoUpdater.on("checking-for-update", () => {
    logger.info("Checking for update...");
});

autoUpdater.on("update-available", () => {
    logger.info("Update available.");
});

autoUpdater.on("update-not-available", () => {
    logger.info("Update not available.");
});

autoUpdater.on("error", (err) => {
    logger.info(`Error in auto-updater. ${err}`);
});

autoUpdater.on("download-progress", (progressObj) => {
    let msg = `Download speed: ${progressObj.bytesPerSecond}`;
    msg += ` - Downloaded ${progressObj.percent}%`;
    msg += ` (${progressObj.transferred}/${progressObj.total})`;
    logger.info(msg);
});

autoUpdater.on("update-downloaded", () => {
    // Update will be installed silently after quitting NepSnowplow
    logger.info("Update downloaded. Restart the app to install.");
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", () => {
    createMainWindow();
    autoUpdater.checkForUpdates();
});
