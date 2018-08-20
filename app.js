"use strict";

// Include app.js directory in node path
process.env.NODE_PATH = __dirname;
require("module").Module._initPaths();
require("module").globalPaths.push(__dirname);

const { app, ipcMain, BrowserWindow, Menu } = require("electron");
const os = require("os");
const fs = require("fs");
const path = require("path");

global.trackedEvents = [];
global.options = loadOptions();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

ipcMain.on("add-event", (event, spEvent) => {
    global.trackedEvents.push(spEvent);
});

ipcMain.on("clear-events", () => {
    global.trackedEvents = [];
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    // if (process.platform != 'darwin') {
    app.quit();
    // }
});

app.on("activate", function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createMainWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", createMainWindow);

function loadOptions() {
    let defaults = {
        showSchemaValidation: false,
        schemaDir: "schemas/",
        listeningPort: 3000
    };
    let userOptions = {};
    try {
        // in production, remove app.asar from the path
        // cannot use process.resourcesPath in development,
        // as that will point to electron/dist in node_modules
        let resourcesPath = app.getAppPath().replace("app.asar", "");
        userOptions = JSON.parse(
            fs.readFileSync(path.resolve(resourcesPath, "settings.json"), "utf-8")
        );
    } catch (err) {
        // catch in case when file could not be resolved,
        // e.g. somebody deleted the settings file
        console.log(err);
    }
    return Object.assign(defaults, userOptions);
}

function createMainWindow() {
    let isWindows = os.platform() === "win32";
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 1024,
        minHeight: 768,
        acceptFirstMouse: true,
        title: "NepSnowplow",
        titleBarStyle: "hidden",
        frame: !isWindows
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "app", "index.html"));

    let template = [
        {
            label: "NepSnowplow",
            submenu: [
                {
                    label: "Quit",
                    accelerator: "Command+Q",
                    click: function() {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: "Debug",
            submenu: [
                {
                    label: "Open debug panel",
                    accelerator: "CmdOrCtrl+D",
                    click: function() {
                        mainWindow.openDevTools();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // Emitted when the window is closed.
    mainWindow.on("closed", function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}
