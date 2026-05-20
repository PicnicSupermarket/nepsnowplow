import type { EventViewModel, ValidationStatus } from "../../../shared/event";
import { Highlight } from "./Highlight";

interface Props {
    event: EventViewModel;
    highlight: string;
}

function ValidityDot({ status }: { status: ValidationStatus }) {
    return <span class={`validity validity--${status}`} aria-label={status} />;
}

export function EventListItem({ event, highlight }: Props) {
    return (
        <article class="event-item">
            <header class="event-item__header">
                <ValidityDot status={event.validationStatus} />
                <span class="event-item__schema">
                    <Highlight text={event.schema.name || "(no schema)"} query={highlight} />
                </span>
                {event.schema.version && (
                    <span class="event-item__version">{event.schema.version}</span>
                )}
            </header>
            {event.contexts.length > 0 && (
                <ul class="event-item__contexts">
                    {event.contexts.map((ctx, i) => (
                        <li key={`${ctx.schema.name}-${i}`}>
                            <ValidityDot status={ctx.validationStatus} />
                            <span class="event-item__schema">
                                <Highlight
                                    text={ctx.schema.name || "(no schema)"}
                                    query={highlight}
                                />
                            </span>
                            {ctx.schema.version && (
                                <span class="event-item__version">{ctx.schema.version}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </article>
    );
}
