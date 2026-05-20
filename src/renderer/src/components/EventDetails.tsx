import { useStore } from "../store";
import type { EventViewModel } from "../../../shared/event";
import { JsonTree } from "./JsonTree";
import { ContextCard } from "./ContextCard";

const STATUS_LABEL: Record<EventViewModel["validationStatus"], string> = {
    valid: "Valid",
    invalid: "Invalid",
    unknown: "Unvalidated",
};

export function EventDetails() {
    const selectedId = useStore((s) => s.selectedId);
    const events = useStore((s) => s.events);
    const filterQuery = useStore((s) => s.filterQuery);

    const event = selectedId !== null ? events.get(selectedId) : undefined;

    if (!event) {
        return <div class="empty">Select an event to inspect it</div>;
    }

    return (
        <div class="details" id={`details-${event.id}`}>
            <header class="details__header">
                <span class={`validity validity--${event.validationStatus}`} aria-hidden="true" />
                <div class="details__title">
                    <h2 class="details__schema">{event.schema.name || "(no schema)"}</h2>
                    {event.schema.version && (
                        <span class="details__version">{event.schema.version}</span>
                    )}
                </div>
                <span class={`badge badge--${event.validationStatus}`}>
                    {STATUS_LABEL[event.validationStatus]}
                </span>
            </header>

            {event.errors && event.errors.length > 0 && (
                <ErrorList status={event.validationStatus} errors={event.errors} />
            )}

            <section class="details__section">
                <h3 class="details__section-title">Payload</h3>
                {event.payload === undefined || event.payload === null ? (
                    <p class="details__empty">No payload</p>
                ) : (
                    <div class="details__json">
                        <JsonTree value={event.payload} highlight={filterQuery} />
                    </div>
                )}
            </section>

            {event.contexts.length > 0 && (
                <section class="details__section">
                    <h3 class="details__section-title">
                        Attached contexts ({event.contexts.length})
                    </h3>
                    <div class="details__contexts">
                        {event.contexts.map((ctx, i) => (
                            <ContextCard
                                key={`${ctx.schema.name}-${i}`}
                                context={ctx}
                                highlight={filterQuery}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function ErrorList({
    status,
    errors,
}: {
    status: EventViewModel["validationStatus"];
    errors: string[];
}) {
    return (
        <ul class={`alert alert--${status}`}>
            {errors.map((err, i) => (
                <li key={i}>{err}</li>
            ))}
        </ul>
    );
}
