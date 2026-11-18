// electron-updater is a CommonJS module published without named ES
// exports. When this file is emitted as ESM the destructured import
// fails at load time with "Named export 'autoUpdater' not found".
// Default-import the package and pull `autoUpdater` off the namespace.
import updaterPkg from "electron-updater";
import log from "electron-log/main";

const { autoUpdater } = updaterPkg;

// Wires electron-log into electron-updater and kicks off a single
// background check. The publish target is read from package.json's
// `build.publish` field (currently a draft-release GitHub provider),
// so no extra config is needed here.
export function startUpdater(): void {
    log.transports.file.level = "info";
    autoUpdater.logger = log;
    log.info("App starting");

    autoUpdater.on("checking-for-update", () => log.info("Checking for update"));
    autoUpdater.on("update-available", (info) => log.info("Update available", info.version));
    autoUpdater.on("update-not-available", () => log.info("Update not available"));
    autoUpdater.on("error", (err) => log.error("auto-updater error", err));
    autoUpdater.on("download-progress", (p) => {
        log.info(
            `Download ${p.percent.toFixed(1)}% ` +
                `(${p.transferred}/${p.total}) at ${p.bytesPerSecond} B/s`,
        );
    });
    autoUpdater.on("update-downloaded", () =>
        log.info("Update downloaded; will install on next quit"),
    );

    void autoUpdater.checkForUpdates().catch((err) => {
        // checkForUpdates rejects when there's no network or no published
        // release yet; both are expected during local development and we
        // don't want them surfacing as uncaught rejections.
        log.warn("checkForUpdates failed", err);
    });
}
