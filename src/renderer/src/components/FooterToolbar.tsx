import { useMemo } from "preact/hooks";
import { useStore } from "../store";
import { filterEvents } from "../lib/visible-events";

export function FooterToolbar() {
    const { ip, port } = useStore((s) => s.serverInfo);
    const paused = useStore((s) => s.paused);
    const events = useStore((s) => s.events);
    const eventOrder = useStore((s) => s.eventOrder);
    const filterQuery = useStore((s) => s.filterQuery);
    const filterValidEvents = useStore((s) => s.filterValidEvents);

    const ready = ip !== null && port > 0;
    const address = ready ? `${ip}:${port}` : "Waiting for collector…";

    // Dot reflects collector state precedence: paused beats ready, so a
    // running but paused collector reads as paused (warn) rather than ok.
    const dotTone = !ready ? "bg-muted" : paused ? "bg-warn" : "bg-ok";

    const total = eventOrder.length;
    // Visible count tracks the same predicate the sidebar uses, so the
    // footer reads the same number the list shows even with the
    // hide-valid toggle or the search filter active.
    const visible = useMemo(
        () => filterEvents(events, eventOrder, filterQuery, filterValidEvents).length,
        [events, eventOrder, filterQuery, filterValidEvents],
    );
    const filtered = visible !== total;
    const noun = total === 1 ? "event" : "events";
    const countLabel = filtered
        ? `${visible.toLocaleString()} of ${total.toLocaleString()} ${noun}`
        : `${total.toLocaleString()} ${noun}`;

    return (
        <footer
            class="flex items-center gap-2 px-3 border-t border-border bg-elevated text-muted text-[11px]"
            aria-live="polite"
        >
            <span class={`w-2 h-2 rounded-full ${dotTone}`} aria-hidden="true" />
            <span>{address}</span>
            {ready && paused && (
                <span class="text-warn font-medium uppercase tracking-wider text-[10px]">
                    Paused
                </span>
            )}
            <span class="ml-auto tabular-nums" title={filtered ? "Visible / total" : undefined}>
                {countLabel}
            </span>
        </footer>
    );
}
