// Phase 0 preload. Intentionally empty — the typed `window.api` surface
// is introduced in Phase 1 alongside the matching `ipcMain.handle`
// handlers in the main process. Keeping the file present so the main
// process can already point at it via `webPreferences.preload`.

export {};
