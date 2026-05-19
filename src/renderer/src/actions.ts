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
