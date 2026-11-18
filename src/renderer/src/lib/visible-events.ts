import type { EventViewModel } from "../../../shared/event";
import { useStore } from "../store";

// Materialises the events currently visible in the sidebar after the
// sidebar filter and the hide-valid toggle have been applied. Both the
// EventList component and the Export action need the same set, so the
// logic lives here rather than being duplicated in each.

export function filterEvents(
    events: Map<number, EventViewModel>,
    order: number[],
    query: string,
    hideValid: boolean,
): EventViewModel[] {
    const q = query.trim().toLowerCase();
    const out: EventViewModel[] = [];
    for (const id of order) {
        const e = events.get(id);
        if (!e) continue;
        if (hideValid && e.isValid) continue;
        if (q && !e.searchableText.includes(q)) continue;
        out.push(e);
    }
    return out;
}

// Snapshot read for non-render callers (actions, shortcut handlers).
// Components should still subscribe via useStore + useMemo so they
// re-render when the underlying state changes.
export function getVisibleEvents(): EventViewModel[] {
    const s = useStore.getState();
    return filterEvents(s.events, s.eventOrder, s.filterQuery, s.filterValidEvents);
}
