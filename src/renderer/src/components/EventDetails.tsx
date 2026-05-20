import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { useStore } from "../store";
import type { EventViewModel } from "../../../shared/event";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { ValidityDot } from "./ui/validity-dot";
import { JsonTree } from "./JsonTree";
import { ContextCard } from "./ContextCard";
import { registerSearch } from "../lib/focus";
import { shortcut } from "../lib/shortcut";
import { displayTitle } from "../lib/event-display";

const STATUS_LABEL: Record<EventViewModel["validationStatus"], string> = {
    valid: "Valid",
    invalid: "Invalid",
    unknown: "Unvalidated",
};

export function EventDetails() {
    const selectedId = useStore((s) => s.selectedId);
    const events = useStore((s) => s.events);
    const detailsQuery = useStore((s) => s.detailsQuery);
    const setDetailsQuery = useStore((s) => s.setDetailsQuery);
    const filterQuery = useStore((s) => s.filterQuery);

    // Cycle state for the in-event search. activeMatch is the index into
    // the currently-rendered list of `<mark data-kind="search">` nodes;
    // matchCount mirrors that list's length so the toolbar chip can show
    // "X of Y". Both reset to 0 / 0 whenever the query or the selected
    // event changes.
    const detailsRef = useRef<HTMLDivElement>(null);
    const [activeMatch, setActiveMatch] = useState(0);
    const [matchCount, setMatchCount] = useState(0);

    const event = selectedId !== null ? events.get(selectedId) : undefined;

    // Reset cycle position whenever the query or the selected event
    // changes; the layout effect below recomputes matchCount on the
    // following render.
    useEffect(() => {
        setActiveMatch(0);
    }, [detailsQuery, selectedId]);

    // Sync data-current on the actual DOM nodes. Runs after every render
    // so the active mark stays correctly tagged even when the JsonTree
    // rebuilds. The setMatchCount call is guarded against the previous
    // value so the effect can't loop.
    useLayoutEffect(() => {
        const root = detailsRef.current;
        if (!root) {
            if (matchCount !== 0) setMatchCount(0);
            return;
        }
        const marks = root.querySelectorAll<HTMLElement>('mark[data-kind="search"]');
        if (marks.length !== matchCount) {
            setMatchCount(marks.length);
        }
        const idx = marks.length === 0 ? -1 : Math.min(activeMatch, marks.length - 1);
        marks.forEach((m, i) => {
            if (i === idx) {
                m.dataset.current = "true";
            } else {
                delete m.dataset.current;
            }
        });
        if (idx >= 0 && detailsQuery.trim()) {
            marks[idx].scrollIntoView({ block: "nearest" });
        }
    }, [activeMatch, detailsQuery, selectedId, matchCount]);

    function cycleMatch(direction: 1 | -1): void {
        const root = detailsRef.current;
        if (!root) return;
        const count = root.querySelectorAll('mark[data-kind="search"]').length;
        if (count === 0) return;
        setActiveMatch((prev) => ((prev + direction) % count + count) % count);
    }

    if (!event) {
        return (
            <div class="grid h-full place-items-center p-6 text-muted text-center">
                Select an event to inspect it
            </div>
        );
    }

    return (
        <div ref={detailsRef} class="p-5 px-6" id={`details-${event.id}`}>
            <header class="flex items-center gap-2.5 mb-3">
                <ValidityDot status={event.validationStatus} />
                <div class="flex items-baseline gap-2 flex-1 min-w-0">
                    <h2 class="m-0 text-base font-semibold truncate">
                        {displayTitle(event)}
                    </h2>
                    {event.kind === "self-describing" && event.schema.version && (
                        <span class="text-xs text-muted tabular-nums">
                            {event.schema.version}
                        </span>
                    )}
                </div>
                {event.kind === "structured" && (
                    <Badge variant="neutral" title="Snowplow structured event (no schema)">
                        Structured
                    </Badge>
                )}
                <Badge variant={event.validationStatus}>
                    {STATUS_LABEL[event.validationStatus]}
                </Badge>
            </header>

            <div class="mb-5 flex items-center gap-2">
                <Input
                    type="search"
                    placeholder={`Search in event  ${shortcut("Mod", "F")}`}
                    value={detailsQuery}
                    onInput={(e) =>
                        setDetailsQuery((e.target as HTMLInputElement).value)
                    }
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            cycleMatch(e.shiftKey ? -1 : 1);
                        }
                    }}
                    aria-label="Search in event"
                    inputRef={(el) => registerSearch("event-search", el)}
                    class="flex-1"
                />
                {detailsQuery.trim() && (
                    <span
                        class="text-[11px] text-muted tabular-nums whitespace-nowrap"
                        aria-live="polite"
                    >
                        {matchCount === 0
                            ? "No matches"
                            : `${activeMatch + 1} of ${matchCount}`}
                    </span>
                )}
            </div>

            {event.errors && event.errors.length > 0 && (
                <ErrorList status={event.validationStatus} errors={event.errors} />
            )}

            <Section title="Payload">
                {event.payload === undefined || event.payload === null ? (
                    <p class="m-0 italic text-muted">No payload</p>
                ) : (
                    <div class="p-3 rounded border border-border bg-elevated font-mono text-xs overflow-x-auto">
                        <JsonTree
                            value={event.payload}
                            search={detailsQuery}
                            filter={filterQuery}
                        />
                    </div>
                )}
            </Section>

            {event.contexts.length > 0 && (
                <Section title={`Attached contexts (${event.contexts.length})`}>
                    <div class="flex flex-col gap-2.5">
                        {event.contexts.map((ctx, i) => (
                            <ContextCard
                                key={`${ctx.schema.name}-${i}`}
                                context={ctx}
                                search={detailsQuery}
                                filter={filterQuery}
                            />
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
    return (
        <section class="mb-6">
            <h3 class="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {title}
            </h3>
            {children}
        </section>
    );
}

function ErrorList({
    status,
    errors,
}: {
    status: EventViewModel["validationStatus"];
    errors: string[];
}) {
    const tone =
        status === "invalid"
            ? "bg-bad/8 border-bad/30 text-bad"
            : "bg-warn/8 border-warn/30 text-warn";
    return (
        <ul class={`mb-4 px-3.5 py-2.5 rounded border list-none text-xs space-y-1 ${tone}`}>
            {errors.map((err, i) => (
                <li key={i}>{err}</li>
            ))}
        </ul>
    );
}
