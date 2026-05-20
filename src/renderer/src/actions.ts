import { useStore } from "./store";

// Composed actions that combine a store mutation with the matching IPC
// call. Components call these so they don't have to remember to fire
// the persistence side of every user interaction. Pure state changes
// stay on the store; anything that crosses the IPC boundary lives here.

export async function clearAllEvents(): Promise<void> {
    useStore.getState().clearEvents();
    await window.api.clearEvents();
}

export async function setFilterValidEvents(value: boolean): Promise<void> {
    useStore.getState().setFilterValidEvents(value);
    await window.api.setFilterValidEvents(value);
}

export function setFilterQuery(query: string): void {
    useStore.getState().setFilterQuery(query);
}

export async function setPaused(value: boolean): Promise<void> {
    useStore.getState().setPaused(value);
    await window.api.setPaused(value);
}

export async function setListeningPort(port: number): Promise<number> {
    // Main rejects on out-of-range values; bubble that up so the caller
    // can surface the error in the dialog rather than silently swallowing.
    return window.api.setListeningPort(port);
}
