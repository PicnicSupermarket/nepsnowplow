// Single source of truth for IPC channel names and the payload shapes
// that travel over them. Imported by main (handler registration), preload
// (channel binding), and renderer (typed `window.api`).

import type { EventViewModel } from "./event";

export interface Options {
    listeningPort: number;
    filterValidEvents: boolean;
    // When true the collector still accepts POSTs but short-circuits to
    // 204 without running the snowplow-micro validation pipeline or
    // forwarding the event to the renderer. Session-scoped: resets to
    // false on every app launch so a paused state can't be left behind.
    paused: boolean;
}

export interface ServerInfo {
    ip: string | null;
    port: number;
}

export const CH = {
    GET_OPTIONS: "options:get",
    SET_FILTER_VALID_EVENTS: "options:set-filter-valid-events",
    SET_LISTENING_PORT: "options:set-listening-port",
    SET_PAUSED: "options:set-paused",

    EXPORT_EVENTS: "events:export",

    GET_INITIAL_EVENTS: "events:get-initial",
    CLEAR_EVENTS: "events:clear",
    EVENT_PUSH: "events:push",

    SERVER_READY: "server:ready",

    WINDOW_MINIMIZE: "window:minimize",
    WINDOW_MAXIMIZE: "window:maximize",
    WINDOW_CLOSE: "window:close",
} as const;

export type Channel = (typeof CH)[keyof typeof CH];

export interface Api {
    // Synchronous platform identifier mirrored from `process.platform` in
    // the preload context. Renderer uses it for chrome that has to react
    // to the host OS (e.g. reserving space for the macOS traffic lights).
    readonly platform: string;

    getOptions(): Promise<Options>;
    setFilterValidEvents(value: boolean): Promise<void>;
    // Pauses / resumes the collector. While paused incoming Snowplow
    // posts still 204 immediately but skip the validation pipeline and
    // never reach the renderer.
    setPaused(value: boolean): Promise<void>;
    // Persists the new port to settings.json and restarts the Express
    // collector listener on it. Rejects with an Error if the port is
    // outside [0, 65535]; passing 0 asks the OS to pick a free one.
    // Resolves to the port the listener actually bound to (which may
    // differ from the requested port when EADDRINUSE forces a fallback).
    setListeningPort(port: number): Promise<number>;

    getInitialEvents(): Promise<EventViewModel[]>;
    clearEvents(): Promise<void>;
    // Opens the OS save dialog and writes `payload` (a serialised JSON
    // string the renderer already produced) to the chosen file. Resolves
    // to true on a successful save, false if the user canceled the
    // dialog. Rejects on IO errors.
    exportEvents(payload: string): Promise<boolean>;

    // Subscribe to push channels. Returns an unsubscribe function so callers
    // (typically component effects) can detach without juggling listener
    // references through the contextBridge boundary.
    onEvent(cb: (event: EventViewModel) => void): () => void;
    onServerReady(cb: (info: ServerInfo) => void): () => void;

    window: {
        minimize(): void;
        maximize(): void;
        close(): void;
    };
}
