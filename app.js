"use strict";

const { app, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const Store = require("electron-store");
const logger = require("electron-log");

const { MainWindow } = require("./app/models/Window");

// Enable logging.
autoUpdater.logger = logger;
autoUpdater.logger.transports.file.level = "info";
logger.info("App starting...");

// Define globals.
global.trackedEvents = [];
global.options = loadStore();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

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
    app.quit();
});

app.on("activate", function() {
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
    logger.info("Error in auto-updater. " + err);
});

autoUpdater.on("download-progress", (progressObj) => {
    let msg = "Download speed: " + progressObj.bytesPerSecond;
    msg += " - Downloaded " + progressObj.percent + "%";
    msg += " (" + progressObj.transferred + "/" + progressObj.total + ")";
    logger.info(msg);
});

autoUpdater.on("update-downloaded", () => {
    // Update will be installed silently after quitting NepSnowplow
    logger.info("Update downloaded");
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", function() {
    createMainWindow();
    autoUpdater.checkForUpdates();
});

function loadStore() {
    let defaults = {
        showSchemaValidation: false,
        listeningPort: 3000
    };
    let store = new Store({
        name: "settings",
        defaults: defaults
    });
    logger.info("Using settings defined in: " + store.path);
    return store;
}

function createMainWindow() {
    mainWindow = new MainWindow();

    // Emitted when the window is closed.
    mainWindow.on("closed", function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}
