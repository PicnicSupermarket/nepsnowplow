// Single source of truth for IPC channel names and the payload shapes
// that travel over them. Imported by main (handler registration), preload
// (channel binding), and renderer (typed `window.api`).

import type { EventViewModel } from "./event";

export interface Options {
    listeningPort: number;
    filterValidEvents: boolean;
}

export interface ServerInfo {
    ip: string | null;
    port: number;
}

export const CH = {
    GET_OPTIONS: "options:get",
    SET_FILTER_VALID_EVENTS: "options:set-filter-valid-events",

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

    getInitialEvents(): Promise<EventViewModel[]>;
    clearEvents(): Promise<void>;

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
