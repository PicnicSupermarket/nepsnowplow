import { useState } from "preact/hooks";
import { useStore } from "../store";
import { clearAllEvents, setFilterQuery, setFilterValidEvents } from "../actions";
import { Button } from "./ui/button";
import { SettingsDialog } from "./SettingsDialog";

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

function IconSettings() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" />
            <path
                d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
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
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <header class="app-header">
            <div class="app-header__actions">
                <Button
                    onClick={() => {
                        void clearAllEvents();
                    }}
                    title="Remove all captured events"
                >
                    <IconTrash />
                    <span>Clear</span>
                </Button>
                <Button
                    variant="toggle"
                    pressed={filterValidEvents}
                    onClick={() => {
                        void setFilterValidEvents(!filterValidEvents);
                    }}
                    title="Hide events that passed validation"
                >
                    <IconEyeOff />
                    <span>Hide valid</span>
                </Button>
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
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
                title="Settings"
            >
                <IconSettings />
            </Button>
            <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </header>
    );
}
