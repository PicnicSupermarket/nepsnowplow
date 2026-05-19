import { useStore } from "../store";
import { clearAllEvents, setFilterQuery, setFilterValidEvents } from "../actions";

// Two-up SVG icons kept inline so we don't ship a font for two glyphs.
// They render currentColor so theme tokens flow through unchanged.
function IconTrash() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    );
}

function IconEyeOff() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M3 3l18 18M10.7 6.2A9.8 9.8 0 0 1 12 6c5 0 9 4.5 10 6-.4.6-1.4 1.9-2.9 3.2M6.6 6.6C4.4 8 2.7 10.3 2 12c1 1.5 5 6 10 6 1.6 0 3-.4 4.3-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    );
}

function IconSearch() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5" />
            <path
                d="m20 20-3.5-3.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
            />
        </svg>
    );
}

export function HeaderToolbar() {
    const filterQuery = useStore((s) => s.filterQuery);
    const filterValidEvents = useStore((s) => s.filterValidEvents);

    return (
        <header class="app-header">
            <div class="app-header__actions">
                <button
                    type="button"
                    class="btn"
                    onClick={() => {
                        void clearAllEvents();
                    }}
                    title="Remove all captured events"
                >
                    <IconTrash />
                    <span>Clear</span>
                </button>
                <button
                    type="button"
                    class={`btn btn--toggle${filterValidEvents ? " is-active" : ""}`}
                    aria-pressed={filterValidEvents}
                    onClick={() => {
                        void setFilterValidEvents(!filterValidEvents);
                    }}
                    title="Hide events that passed validation"
                >
                    <IconEyeOff />
                    <span>Hide valid</span>
                </button>
            </div>
            <label class="app-header__search">
                <IconSearch />
                <input
                    type="search"
                    placeholder="Filter events"
                    value={filterQuery}
                    onInput={(e) => setFilterQuery((e.target as HTMLInputElement).value)}
                    aria-label="Filter events"
                />
            </label>
        </header>
    );
}
