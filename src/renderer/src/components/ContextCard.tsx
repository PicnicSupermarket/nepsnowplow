import type { EventContext } from "../../../shared/event";
import { Badge } from "./ui/badge";
import { ValidityDot } from "./ui/validity-dot";
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
    const errorTone =
        context.validationStatus === "invalid"
            ? "bg-bad/8 border-bad/30 text-bad"
            : "bg-warn/8 border-warn/30 text-warn";

    return (
        <article class="px-3.5 py-3 rounded border border-border bg-elevated">
            <header class="flex items-center gap-2 mb-2.5">
                <ValidityDot status={context.validationStatus} />
                <h4 class="m-0 text-[13px] font-semibold truncate">
                    {context.schema.name || "(no schema)"}
                </h4>
                {context.schema.version && (
                    <span class="text-[11px] text-muted tabular-nums">
                        {context.schema.version}
                    </span>
                )}
                <Badge variant={context.validationStatus} class="ml-auto">
                    {STATUS_LABEL[context.validationStatus]}
                </Badge>
            </header>

            {context.errors && context.errors.length > 0 && (
                <ul
                    class={`mb-2.5 px-3.5 py-2.5 rounded border list-none text-xs space-y-1 ${errorTone}`}
                >
                    {context.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                    ))}
                </ul>
            )}

            {context.payload !== undefined && context.payload !== null && (
                <div class="font-mono text-xs overflow-x-auto">
                    <JsonTree value={context.payload} highlight={highlight} />
                </div>
            )}
        </article>
    );
}
