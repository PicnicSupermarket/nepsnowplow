import { useEffect, useMemo, useRef } from "preact/hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { EventViewModel } from "../../../shared/event";
import { useStore } from "../store";
import { EventListItem } from "./EventListItem";

// Approximate row height; virtualizer corrects against actual DOM size as
// rows mount so this only affects the initial estimate.
const ROW_ESTIMATE = 48;

function filterEvents(
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

export function EventList() {
    const events = useStore((s) => s.events);
    const eventOrder = useStore((s) => s.eventOrder);
    const filterQuery = useStore((s) => s.filterQuery);
    const filterValidEvents = useStore((s) => s.filterValidEvents);
    const selectedId = useStore((s) => s.selectedId);
    const select = useStore((s) => s.select);

    // Memoised so the virtualizer's `count` reference is stable across
    // unrelated store updates (e.g. typing in the filter doesn't rebuild
    // the array when there are no events).
    const visible = useMemo(
        () => filterEvents(events, eventOrder, filterQuery, filterValidEvents),
        [events, eventOrder, filterQuery, filterValidEvents],
    );

    const scrollRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: visible.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_ESTIMATE,
        overscan: 8,
        getItemKey: (index) => visible[index].id,
    });

    // Keyboard navigation: ArrowUp / ArrowDown walks the visible list.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            if (visible.length === 0) return;
            const target = e.target as HTMLElement | null;
            // Don't hijack typing inside the search field.
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
            e.preventDefault();
            const currentIdx = visible.findIndex((ev) => ev.id === selectedId);
            let nextIdx: number;
            if (currentIdx === -1) {
                nextIdx = e.key === "ArrowDown" ? 0 : visible.length - 1;
            } else {
                nextIdx = e.key === "ArrowDown" ? currentIdx + 1 : currentIdx - 1;
            }
            if (nextIdx < 0 || nextIdx >= visible.length) return;
            select(visible[nextIdx].id);
            virtualizer.scrollToIndex(nextIdx, { align: "auto" });
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [visible, selectedId, select, virtualizer]);

    if (visible.length === 0) {
        return (
            <div class="grid h-full place-items-center p-6 text-muted text-center">
                {eventOrder.length === 0 ? "No events yet" : "No events match the filter"}
            </div>
        );
    }

    const rows = virtualizer.getVirtualItems();
    return (
        <div
            ref={scrollRef}
            class="flex-1 overflow-auto outline-none"
            role="listbox"
            aria-label="Captured events"
        >
            <div class="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                {rows.map((row) => {
                    const event = visible[row.index];
                    const isSelected = event.id === selectedId;
                    return (
                        <div
                            key={event.id}
                            data-index={row.index}
                            ref={virtualizer.measureElement}
                            class={`absolute inset-x-0 top-0 px-3 py-2 border-b border-border cursor-pointer select-none transition-colors duration-75 hover:bg-sunken ${
                                isSelected ? "bg-selected" : ""
                            }`}
                            style={{ transform: `translateY(${row.start}px)` }}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => select(event.id)}
                        >
                            <EventListItem event={event} highlight={filterQuery} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
