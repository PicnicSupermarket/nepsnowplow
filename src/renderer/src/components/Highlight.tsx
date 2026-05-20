import type { ComponentChild } from "preact";

interface Props {
    text: string;
    query: string;
}

// Render `text` with case-insensitive substring matches of `query`
// wrapped in <mark>. Used by both the event list and the JSON tree so
// the filter input lights up matches everywhere they appear.
export function Highlight({ text, query }: Props) {
    const q = query.trim();
    if (!q) return <>{text}</>;
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    const parts: ComponentChild[] = [];
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
