import { EventViewModel, MAX_EVENTS } from "../shared/event";

type Listener = (event: EventViewModel) => void;

// Source of truth for captured events, owned by main. The renderer is
// re-seeded from it on window reload and the MCP server reads from it.
//
// Ids are monotonic for the lifetime of the process and are NOT reset by
// `clear()`, so an id handed out as a cursor (e.g. `since_id`) can never
// point at a different event later on.
export class EventStore {
    private events: EventViewModel[] = [];
    private nextId = 0;
    private readonly listeners = new Set<Listener>();

    allocateId(): number {
        return this.nextId++;
    }

    // Id of the most recently allocated event, or -1 if none yet.
    get latestId(): number {
        return this.nextId - 1;
    }

    get size(): number {
        return this.events.length;
    }

    all(): readonly EventViewModel[] {
        return this.events;
    }

    add(event: EventViewModel): void {
        this.events.push(event);
        while (this.events.length > MAX_EVENTS) {
            this.events.shift();
        }
        for (const listener of this.listeners) listener(event);
    }

    clear(): void {
        this.events = [];
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}
