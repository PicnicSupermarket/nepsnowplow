import type { EventContext } from "../../../shared/event";
import { JsonTree } from "./JsonTree";

interface Props {
    context: EventContext;
    highlight: string;
}

const STATUS_LABEL: Record<EventContext["validationStatus"], string> = {
    valid: "Valid",
    invalid: "Invalid",
    unknown: "Unvalidated",
};

export function ContextCard({ context, highlight }: Props) {
    return (
        <article class="context-card">
            <header class="context-card__header">
                <span
                    class={`validity validity--${context.validationStatus}`}
                    aria-hidden="true"
                />
                <h4 class="context-card__schema">{context.schema.name || "(no schema)"}</h4>
                {context.schema.version && (
                    <span class="context-card__version">{context.schema.version}</span>
                )}
                <span class={`badge badge--${context.validationStatus}`}>
                    {STATUS_LABEL[context.validationStatus]}
                </span>
            </header>

            {context.errors && context.errors.length > 0 && (
                <ul class={`alert alert--${context.validationStatus}`}>
                    {context.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                    ))}
                </ul>
            )}

            {context.payload !== undefined && context.payload !== null && (
                <div class="context-card__json">
                    <JsonTree value={context.payload} highlight={highlight} />
                </div>
            )}
        </article>
    );
}
