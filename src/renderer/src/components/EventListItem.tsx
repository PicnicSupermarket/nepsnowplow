import type { EventViewModel } from "../../../shared/event";
import { Highlight } from "./Highlight";
import { ValidityDot } from "./ui/validity-dot";

interface Props {
    event: EventViewModel;
    highlight: string;
}

export function EventListItem({ event, highlight }: Props) {
    return (
        <article>
            <header class="flex items-center gap-1.5 font-semibold">
                <ValidityDot status={event.validationStatus} />
                <span class="truncate">
                    <Highlight text={event.schema.name || "(no schema)"} query={highlight} />
                </span>
                {event.schema.version && (
                    <span class="ml-auto text-[11px] font-normal text-muted tabular-nums">
                        {event.schema.version}
                    </span>
                )}
            </header>
            {event.contexts.length > 0 && (
                <ul class="list-none m-0 mt-1 pl-3.5 text-xs text-muted">
                    {event.contexts.map((ctx, i) => (
                        <li
                            key={`${ctx.schema.name}-${i}`}
                            class="flex items-center gap-1.5 leading-6"
                        >
                            <ValidityDot status={ctx.validationStatus} />
                            <span class="truncate">
                                <Highlight
                                    text={ctx.schema.name || "(no schema)"}
                                    query={highlight}
                                />
                            </span>
                            {ctx.schema.version && (
                                <span class="ml-auto text-[11px] tabular-nums">
                                    {ctx.schema.version}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </article>
    );
}
