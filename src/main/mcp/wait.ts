import type { EventViewModel } from "../../shared/event";
import type { EventStore } from "../event-store";

export interface WaitResult {
    events: EventViewModel[];
    // Pass back as `after_id` on the next call to continue without gaps
    // or repeats. Equals the last returned event's id when the result was
    // capped by `maxEvents` (so the remaining matches are not skipped),
    // otherwise the latest id seen, so non-matching events aren't rescanned.
    cursor: number;
    timedOut: boolean;
}

// Once the first match arrives, wait this long for stragglers so a burst
// of events (one tracker bundle) comes back as one batch, not one call each.
const BATCH_WINDOW_MS = 250;

// Resolves with events matching `matches` that arrived after `afterId`.
// Returns immediately when such events already exist, otherwise blocks
// until one arrives, `timeoutMs` elapses or `signal` aborts.
export async function waitForEvents(
    store: EventStore,
    matches: (event: EventViewModel) => boolean,
    opts: { afterId: number; maxEvents: number; timeoutMs: number; signal?: AbortSignal },
): Promise<WaitResult> {
    const collect = (): WaitResult => {
        const found = store.all().filter((e) => e.id > opts.afterId && matches(e));
        const events = found.slice(0, opts.maxEvents);
        const capped = found.length > events.length;
        return {
            events,
            cursor: capped ? events[events.length - 1].id : store.latestId,
            timedOut: events.length === 0,
        };
    };

    const immediate = collect();
    if (!immediate.timedOut) return immediate;

    await new Promise<void>((resolve) => {
        let batchTimer: ReturnType<typeof setTimeout> | undefined;
        const finish = () => {
            clearTimeout(timeout);
            clearTimeout(batchTimer);
            unsubscribe();
            opts.signal?.removeEventListener("abort", finish);
            resolve();
        };
        const timeout = setTimeout(finish, opts.timeoutMs);
        const unsubscribe = store.subscribe((event) => {
            if (batchTimer === undefined && event.id > opts.afterId && matches(event)) {
                batchTimer = setTimeout(finish, BATCH_WINDOW_MS);
            }
        });
        if (opts.signal?.aborted) finish();
        else opts.signal?.addEventListener("abort", finish);
    });

    return collect();
}
