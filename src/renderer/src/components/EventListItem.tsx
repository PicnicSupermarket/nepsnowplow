import type { EventViewModel, ValidationStatus } from "../../../shared/event";

interface Props {
    event: EventViewModel;
    highlight: string;
}

function ValidityDot({ status }: { status: ValidationStatus }) {
    return <span class={`validity validity--${status}`} aria-label={status} />;
}

// Render `text` with case-insensitive substring matches of `query` wrapped
// in <mark>. Filtering already guarantees we only get here for rows that
// contain the query somewhere; that match might be in a context name or
// inside the payload, so a missing match in the schema name is fine.
function Highlight({ text, query }: { text: string; query: string }) {
    const q = query.trim();
    if (!q) return <>{text}</>;
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    const parts: preact.ComponentChild[] = [];
    let cursor = 0;
    while (cursor < text.length) {
        const idx = lower.indexOf(needle, cursor);
        if (idx === -1) {
            parts.push(text.slice(cursor));
            break;
        }
        if (idx > cursor) parts.push(text.slice(cursor, idx));
        parts.push(<mark key={idx}>{text.slice(idx, idx + needle.length)}</mark>);
        cursor = idx + needle.length;
    }
    return <>{parts}</>;
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
