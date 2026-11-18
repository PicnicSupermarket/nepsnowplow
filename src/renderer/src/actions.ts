import { useStore } from "./store";
import { serializeEvents } from "./lib/serialize";
import { getVisibleEvents } from "./lib/visible-events";

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

// Exports every event currently visible in the sidebar (after the filter
// and hide-valid toggle). Reads the visible set at call time rather than
// taking it as an argument so shortcut handlers and context menu items
// don't have to materialise it themselves. Returns true on a successful
// write, false if the user canceled the save dialog or there was nothing
// to export.
export async function exportVisibleEvents(): Promise<boolean> {
    const events = getVisibleEvents();
    if (events.length === 0) {
        return false;
    }
    const payload = JSON.stringify(serializeEvents(events), null, 2);
    return window.api.exportEvents(payload);
}
