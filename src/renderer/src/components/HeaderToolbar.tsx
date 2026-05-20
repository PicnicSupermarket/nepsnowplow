import { useState } from "preact/hooks";
import { useStore } from "../store";
import {
    clearAllEvents,
    exportVisibleEvents,
    setFilterQuery,
    setFilterValidEvents,
    setPaused,
} from "../actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SettingsDialog } from "./SettingsDialog";
import { registerSearch } from "../lib/focus";
import { shortcut } from "../lib/shortcut";

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

function IconPause() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
            <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
        </svg>
    );
}

function IconPlay() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 5l12 7-12 7V5z" fill="currentColor" />
        </svg>
    );
}

function IconDownload() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
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
    const paused = useStore((s) => s.paused);
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <header
            class="flex items-center gap-3 px-3 border-b border-border bg-elevated"
            style="-webkit-app-region: drag"
            data-traffic-light-pad
        >
            <div
                class="flex gap-1.5"
                style="-webkit-app-region: no-drag"
            >
                <Button
                    variant="toggle"
                    pressed={paused}
                    onClick={() => {
                        void setPaused(!paused);
                    }}
                    title={
                        paused
                            ? "Resume recording incoming events"
                            : "Pause recording — incoming posts get a 204 but are dropped"
                    }
                >
                    {paused ? <IconPlay /> : <IconPause />}
                    <span>{paused ? "Resume" : "Pause"}</span>
                </Button>
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
                <Button
                    onClick={() => {
                        void exportVisibleEvents();
                    }}
                    title={`Export all visible events as JSON  ${shortcut("Mod", "S")}`}
                >
                    <IconDownload />
                    <span>Export</span>
                </Button>
            </div>
            <label
                class="ml-auto flex items-center gap-1.5 px-2 w-56 h-[26px] rounded-sm border border-border bg-sunken text-muted focus-within:border-accent focus-within:text-fg"
                style="-webkit-app-region: no-drag"
            >
                <IconSearch />
                <Input
                    type="search"
                    placeholder={`Filter events  ${shortcut("Mod", "Shift", "F")}`}
                    value={filterQuery}
                    onInput={(e) => setFilterQuery((e.target as HTMLInputElement).value)}
                    aria-label="Filter events"
                    inputRef={(el) => registerSearch("list-filter", el)}
                    class="flex-1 min-w-0 h-auto px-0 border-0 bg-transparent rounded-none focus:border-0"
                />
            </label>
            <div style="-webkit-app-region: no-drag">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Settings"
                    title="Settings"
                >
                    <IconSettings />
                </Button>
            </div>
            <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </header>
    );
}
