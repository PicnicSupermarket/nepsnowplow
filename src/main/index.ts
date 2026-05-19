import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { CH, Options, RawEvent } from "../shared/ipc";

// Phase 1 main process. Opens the renderer window with a sandboxed
// webPreferences and registers the IPC surface declared in
// src/shared/ipc.ts. Event capture (push channel) and snowplow-micro
// server startup are wired in Phase 3 — until then `getInitialEvents`
// returns an empty array and `onEvent` simply never fires.

const DEFAULT_OPTIONS: Options = {
    listeningPort: 3000,
    filterValidEvents: false,
};

function loadOptions(): Options {
    try {
        // In packaged mode `app.getAppPath()` returns path/to/app.asar but
        // settings.json ships in extraResources alongside it; in dev it
        // returns the project root and the same path resolves directly.
        const resourcesPath = app.getAppPath().replace("app.asar", "");
        const raw = fs.readFileSync(path.resolve(resourcesPath, "settings.json"), "utf-8");
        const parsed = JSON.parse(raw) as Partial<Options>;
        return { ...DEFAULT_OPTIONS, ...parsed };
    } catch {
        return { ...DEFAULT_OPTIONS };
    }
}

// In-memory state owned by main. The renderer treats main as the source of
// truth so a window reload re-seeds from here instead of losing history.
let options: Options = { ...DEFAULT_OPTIONS };
const trackedEvents: RawEvent[] = [];

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
    const isWindows = os.platform() === "win32";

    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 1024,
        minHeight: 768,
        acceptFirstMouse: true,
        title: "NepperSnowplow",
        titleBarStyle: "hidden",
        frame: !isWindows,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, "../preload/index.mjs"),
        },
    });

    const devUrl = process.env.ELECTRON_RENDERER_URL;
    if (devUrl) {
        mainWindow.loadURL(devUrl);
    } else {
        mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

function registerIpc(): void {
    ipcMain.handle(CH.GET_OPTIONS, () => options);

    ipcMain.handle(CH.SET_FILTER_VALID_EVENTS, (_e, value: boolean) => {
        options = { ...options, filterValidEvents: Boolean(value) };
    });

    ipcMain.handle(CH.GET_INITIAL_EVENTS, () => trackedEvents.slice());

    ipcMain.handle(CH.CLEAR_EVENTS, () => {
        trackedEvents.length = 0;
    });

    ipcMain.on(CH.WINDOW_MINIMIZE, () => mainWindow?.minimize());
    ipcMain.on(CH.WINDOW_MAXIMIZE, () => {
        if (!mainWindow) return;
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });
    ipcMain.on(CH.WINDOW_CLOSE, () => mainWindow?.close());
}

app.on("window-all-closed", () => {
    app.quit();
});

app.on("activate", () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});

app.whenReady().then(() => {
    options = loadOptions();
    registerIpc();
    createMainWindow();
});
