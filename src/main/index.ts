import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { CH, Options, ServerInfo } from "../shared/ipc";
import { EventViewModel, MAX_EVENTS } from "../shared/event";
import { Collector } from "./server/collector";
import { startUpdater } from "./updater";

const DEFAULT_OPTIONS: Options = {
    listeningPort: 3000,
    filterValidEvents: false,
};

// Resolves the directory containing the bundled extra resources (jre/,
// jars/, snowplow_micro_config/, settings.json). In packaged builds
// electron-builder places these at process.resourcesPath; in dev and
// e2e the bundled main entry sits at `<project>/out/main/index.mjs`,
// so the project root is two dirs up.
function resourcesPath(): string {
    if (app.isPackaged) {
        return process.resourcesPath;
    }
    return path.resolve(__dirname, "..", "..");
}

function settingsPath(): string {
    return path.resolve(resourcesPath(), "settings.json");
}

function loadOptions(): Options {
    try {
        const raw = fs.readFileSync(settingsPath(), "utf-8");
        const parsed = JSON.parse(raw) as Partial<Options>;
        return { ...DEFAULT_OPTIONS, ...parsed };
    } catch {
        return { ...DEFAULT_OPTIONS };
    }
}

// Persist the subset of options that survives across app restarts.
// `filterValidEvents` is deliberately session-scoped (matches dev-tool
// convention: filters reset between launches) so it stays out of the
// file.
function persistOptions(): void {
    const payload = { listeningPort: options.listeningPort };
    fs.writeFileSync(settingsPath(), `${JSON.stringify(payload, null, 4)}\n`, "utf-8");
}

function firstLanIp(): string | null {
    for (const ifaces of Object.values(os.networkInterfaces())) {
        for (const iface of ifaces ?? []) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
}

// Source-of-truth state owned by main. Window reloads re-seed the
// renderer from this mirror so captured history survives a refresh.
let options: Options = { ...DEFAULT_OPTIONS };
const trackedEvents: EventViewModel[] = [];
let nextEventId = 0;
let serverInfo: ServerInfo = { ip: null, port: 0 };

let mainWindow: BrowserWindow | null = null;
let collector: Collector | null = null;

function createMainWindow(): void {
    const isMac = os.platform() === "darwin";

    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 1024,
        minHeight: 768,
        acceptFirstMouse: true,
        title: "NepperSnowplow",
        // On macOS we let the OS render the traffic lights inside a
        // reserved area at the top-left. The renderer reserves an
        // equivalent strip of padding so toolbar contents never overlap.
        // Other platforms get the standard system frame.
        titleBarStyle: isMac ? "hiddenInset" : "default",
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, "../preload/index.cjs"),
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

    ipcMain.handle(CH.SET_LISTENING_PORT, async (_e, port: number) => {
        if (!Number.isInteger(port) || port < 0 || port > 65535) {
            throw new Error(`Invalid port: ${port}`);
        }
        options = { ...options, listeningPort: port };
        persistOptions();
        if (collector) {
            await collector.restartListener(port);
        }
        return serverInfo.port;
    });

    ipcMain.handle(CH.GET_INITIAL_EVENTS, () => trackedEvents.slice());

    ipcMain.handle(CH.CLEAR_EVENTS, () => {
        trackedEvents.length = 0;
        nextEventId = 0;
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

function pushToRenderer(channel: string, payload: unknown): void {
    // The renderer is the only consumer of push channels. When the window
    // is closed (between `closed` and `activate`) we drop pushes silently
    // — the renderer will re-seed from `trackedEvents` on next mount.
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(channel, payload);
}

function recordEvent(event: EventViewModel): void {
    trackedEvents.push(event);
    while (trackedEvents.length > MAX_EVENTS) {
        trackedEvents.shift();
    }
    pushToRenderer(CH.EVENT_PUSH, event);
}

// Debug hook read by the Playwright e2e suite to discover the actual
// port the collector bound to (which may differ from the configured one
// when the configured port is busy). Kept on globalThis rather than on
// the IPC surface so it stays a test-only affordance.
interface DebugGlobals {
    __nepsnowplowPort?: number;
}

function recordServerReady(port: number): void {
    serverInfo = { ip: firstLanIp(), port };
    (globalThis as DebugGlobals).__nepsnowplowPort = port;
    pushToRenderer(CH.SERVER_READY, serverInfo);
}

async function startCollector(): Promise<void> {
    collector = new Collector({
        resourcesPath: resourcesPath(),
        proposedPort: options.listeningPort,
        onEvent: recordEvent,
        onReady: recordServerReady,
        nextId: () => nextEventId++,
    });
    try {
        await collector.start();
    } catch (err) {
        console.error("Failed to start collector", err);
    }
}

app.on("window-all-closed", () => {
    collector?.stop();
    app.quit();
});

app.on("activate", () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});

app.whenReady().then(async () => {
    options = loadOptions();
    registerIpc();
    createMainWindow();
    // The auto-updater check is fire-and-forget; failures get logged but
    // never block startup.
    if (app.isPackaged) {
        startUpdater();
    }
    // The collector is the slow part of startup (JVM boot). Run it after
    // the window is created so the renderer can paint its shell and
    // show "waiting for collector…" instead of a blank screen.
    await startCollector();
});
