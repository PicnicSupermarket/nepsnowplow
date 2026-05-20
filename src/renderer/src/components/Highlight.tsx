import type { ComponentChild } from "preact";

interface Props {
    text: string;
    // Primary highlight (yellow) driven by the in-event search input
    // (⌘F). This is the one Enter cycles through.
    search?: string;
    // Secondary highlight (blue) driven by the sidebar filter (⌘⇧F).
    // Always painted underneath search matches if both queries hit the
    // same substring.
    filter?: string;
}

interface Match {
    start: number;
    end: number;
    kind: "search" | "filter";
}

// Collect non-overlapping case-insensitive matches of every query
// against `text`, with search matches winning over filter matches when
// the two queries hit the same substring. Sorted by start position so
// the renderer can slice once and emit segments in order.
function collectMatches(text: string, queries: { needle: string; kind: Match["kind"] }[]): Match[] {
    const lower = text.toLowerCase();
    const raw: Match[] = [];
    // Process in declared order so the priority tie-breaker below
    // resolves to whichever kind appears first in `queries`.
    for (const { needle, kind } of queries) {
        if (!needle) continue;
        const n = needle.toLowerCase();
        let cursor = 0;
        while (cursor < text.length) {
            const idx = lower.indexOf(n, cursor);
            if (idx === -1) break;
            raw.push({ start: idx, end: idx + n.length, kind });
            cursor = idx + n.length;
        }
    }
    raw.sort((a, b) => a.start - b.start);
    // Drop any match that begins inside the previous one — keeps the
    // output non-overlapping and reflects the declared priority since
    // duplicates at the same position keep their first-seen kind.
    const out: Match[] = [];
    let lastEnd = 0;
    for (const m of raw) {
        if (m.start >= lastEnd) {
            out.push(m);
            lastEnd = m.end;
        }
    }
    return out;
}

// Render `text` with matches of either query wrapped in `<mark>` tags,
// each tagged with a `data-kind` so the stylesheet can pick a colour
// per highlight type and the cycle code can target the search ones.
export function Highlight({ text, search = "", filter = "" }: Props) {
    const s = search.trim();
    const f = filter.trim();
    if (!s && !f) return <>{text}</>;

    const matches = collectMatches(text, [
        { needle: s, kind: "search" },
        { needle: f, kind: "filter" },
    ]);
    if (matches.length === 0) return <>{text}</>;

    const parts: ComponentChild[] = [];
    let cursor = 0;
    for (const m of matches) {
        if (m.start > cursor) parts.push(text.slice(cursor, m.start));
        parts.push(
            <mark key={`${m.start}-${m.kind}`} data-kind={m.kind}>
                {text.slice(m.start, m.end)}
            </mark>,
        );
        cursor = m.end;
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return <>{parts}</>;
}
