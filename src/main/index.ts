import { app, BrowserWindow } from "electron";
import path from "node:path";
import os from "node:os";

// Phase 0 main process. Just opens the renderer window. Server start,
// settings load, IPC handlers, autoUpdater wiring all move in later
// phases — for now we only need the window to come up so the new
// pipeline can be verified end-to-end.

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

    // In dev electron-vite serves the renderer over HTTP and injects the
    // URL via ELECTRON_RENDERER_URL. In production the renderer is bundled
    // to ../renderer/index.html relative to the compiled main entry.
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

app.on("window-all-closed", () => {
    app.quit();
});

app.on("activate", () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});

app.whenReady().then(() => {
    createMainWindow();
});
