import { create } from "zustand";
import type { ServerInfo } from "../../shared/ipc";
import { EventViewModel, MAX_EVENTS } from "../../shared/event";

interface State {
    events: Map<number, EventViewModel>;
    eventOrder: number[];
    selectedId: number | null;
    filterQuery: string;
    filterValidEvents: boolean;
    serverInfo: ServerInfo;
}

interface Actions {
    ingestEvents(batch: EventViewModel[]): void;
    clearEvents(): void;
    select(id: number | null): void;
    setFilterQuery(query: string): void;
    setFilterValidEvents(value: boolean): void;
    setServerInfo(info: ServerInfo): void;
}

export type Store = State & Actions;

const initialState: State = {
    events: new Map(),
    eventOrder: [],
    selectedId: null,
    filterQuery: "",
    filterValidEvents: false,
    serverInfo: { ip: null, port: 0 },
};

export const useStore = create<Store>((set) => ({
    ...initialState,

    ingestEvents: (batch) =>
        set((s) => {
            if (batch.length === 0) {
                return s;
            }
            const events = new Map(s.events);
            const eventOrder = s.eventOrder.slice();
            for (const e of batch) {
                if (!events.has(e.id)) {
                    eventOrder.push(e.id);
                }
                events.set(e.id, e);
            }
            // FIFO eviction: trim the oldest ids if we've grown past the cap.
            // A burst large enough to exceed the cap in one ingest pass
            // (window-reload seed, replay) still leaves us with exactly
            // MAX_EVENTS at the head.
            while (eventOrder.length > MAX_EVENTS) {
                const evicted = eventOrder.shift();
                if (evicted !== undefined) {
                    events.delete(evicted);
                }
            }
            // The currently-selected event may have just been evicted; in
            // that case drop the selection rather than leave a dangling id.
            const selectedId =
                s.selectedId !== null && !events.has(s.selectedId) ? null : s.selectedId;
            return { events, eventOrder, selectedId };
        }),

    clearEvents: () =>
        set({
            events: new Map(),
            eventOrder: [],
            selectedId: null,
        }),

    select: (id) => set({ selectedId: id }),

    setFilterQuery: (query) => set({ filterQuery: query }),

    setFilterValidEvents: (value) => set({ filterValidEvents: value }),

    setServerInfo: (info) => set({ serverInfo: info }),
}));
