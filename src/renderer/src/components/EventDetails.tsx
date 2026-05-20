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

    const event = selectedId !== null ? events.get(selectedId) : undefined;

    if (!event) {
        return (
            <div class="grid h-full place-items-center p-6 text-muted text-center">
                Select an event to inspect it
            </div>
        );
    }

    return (
        <div class="p-5 px-6" id={`details-${event.id}`}>
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

            <div class="mb-5">
                <Input
                    type="search"
                    placeholder={`Search in event  ${shortcut("Mod", "F")}`}
                    value={detailsQuery}
                    onInput={(e) =>
                        setDetailsQuery((e.target as HTMLInputElement).value)
                    }
                    aria-label="Search in event"
                    inputRef={(el) => registerSearch("event-search", el)}
                    class="w-full"
                />
            </div>

            {event.errors && event.errors.length > 0 && (
                <ErrorList status={event.validationStatus} errors={event.errors} />
            )}

            <Section title="Payload">
                {event.payload === undefined || event.payload === null ? (
                    <p class="m-0 italic text-muted">No payload</p>
                ) : (
                    <div class="p-3 rounded border border-border bg-elevated font-mono text-xs overflow-x-auto">
                        <JsonTree value={event.payload} highlight={detailsQuery} />
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
                                highlight={detailsQuery}
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
