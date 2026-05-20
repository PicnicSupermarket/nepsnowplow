import { useState } from "preact/hooks";
import { Highlight } from "./Highlight";

interface Props {
    value: unknown;
    highlight?: string;
    // Auto-collapse nodes that span more rows than this when first rendered.
    // The user can still expand them on demand. Picked to keep large
    // payloads (think e-commerce carts with hundreds of line items)
    // navigable without overwhelming the pane.
    collapseAfter?: number;
}

// JSON tree renderer with click-to-collapse on objects and arrays. Keys
// and string values flow through the same Highlight component the event
// list uses, so the search field works inside the details pane without
// any extra plumbing.
export function JsonTree({ value, highlight = "", collapseAfter = 30 }: Props) {
    return <Node value={value} highlight={highlight} collapseAfter={collapseAfter} depth={0} />;
}

interface NodeProps {
    value: unknown;
    highlight: string;
    collapseAfter: number;
    depth: number;
}

function Node({ value, highlight, collapseAfter, depth }: NodeProps) {
    if (value === null) return <span class="text-muted italic">null</span>;
    if (value === undefined) return <span class="text-muted italic">undefined</span>;
    if (typeof value === "string") {
        return (
            <span class="text-json-string">
                "<Highlight text={value} query={highlight} />"
            </span>
        );
    }
    if (typeof value === "number") {
        return <span class="text-accent">{String(value)}</span>;
    }
    if (typeof value === "boolean") {
        return <span class="text-json-bool">{String(value)}</span>;
    }
    if (Array.isArray(value)) {
        return (
            <Collection
                entries={value.map((item, i) => [i, item] as const)}
                open="["
                close="]"
                renderKey={(k) => <span class="text-muted tabular-nums">{k}</span>}
                highlight={highlight}
                collapseAfter={collapseAfter}
                depth={depth}
            />
        );
    }
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>);
        return (
            <Collection
                entries={entries}
                open="{"
                close="}"
                renderKey={(k) => (
                    <span class="text-accent">
                        "<Highlight text={String(k)} query={highlight} />"
                    </span>
                )}
                highlight={highlight}
                collapseAfter={collapseAfter}
                depth={depth}
            />
        );
    }
    return <span>{String(value)}</span>;
}

interface CollectionProps<K extends string | number> {
    entries: ReadonlyArray<readonly [K, unknown]>;
    open: string;
    close: string;
    renderKey: (key: K) => preact.ComponentChild;
    highlight: string;
    collapseAfter: number;
    depth: number;
}

function Collection<K extends string | number>({
    entries,
    open,
    close,
    renderKey,
    highlight,
    collapseAfter,
    depth,
}: CollectionProps<K>) {
    const [collapsed, setCollapsed] = useState(entries.length > collapseAfter);
    if (entries.length === 0) {
        return (
            <span class="text-muted">
                {open}
                {close}
            </span>
        );
    }
    return (
        <span class="inline-block align-top">
            <button
                type="button"
                class="inline-flex items-baseline gap-0.5 p-0 m-0 bg-transparent border-0 cursor-pointer text-inherit font-inherit focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 rounded-sm"
                onClick={() => setCollapsed((c) => !c)}
                aria-expanded={!collapsed}
            >
                <span class="inline-block w-2.5 text-muted text-[10px]">
                    {collapsed ? "▸" : "▾"}
                </span>
                <span class="text-muted">{open}</span>
                {collapsed && (
                    <span class="mx-1 text-muted italic">
                        {entries.length} item{entries.length === 1 ? "" : "s"}
                    </span>
                )}
                {collapsed && <span class="text-muted">{close}</span>}
            </button>
            {!collapsed && (
                <>
                    <ul class="list-none m-0 ml-1 pl-[18px] border-l border-dashed border-border">
                        {entries.map(([key, val]) => (
                            <li key={String(key)} class="leading-[1.55]">
                                {renderKey(key)}
                                <span class="text-muted">: </span>
                                <Node
                                    value={val}
                                    highlight={highlight}
                                    collapseAfter={collapseAfter}
                                    depth={depth + 1}
                                />
                            </li>
                        ))}
                    </ul>
                    <span class="text-muted">{close}</span>
                </>
            )}
        </span>
    );
}
