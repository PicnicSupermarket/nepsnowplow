import { useEffect } from "preact/hooks";
import { HeaderToolbar } from "./components/HeaderToolbar";
import { FooterToolbar } from "./components/FooterToolbar";
import { PaneGroup } from "./components/PaneGroup";
import { EventList } from "./components/EventList";
import { EventDetails } from "./components/EventDetails";
import { useStore } from "./store";
import { focusSearch } from "./lib/focus";

export function App() {
    useEffect(() => {
        // Tag the root for platform-specific chrome (currently used to
        // reserve space for the macOS traffic light buttons).
        document.documentElement.dataset.platform = window.api.platform;

        const store = useStore.getState();
        let cancelled = false;

        // Initial seed: pull captured events and current options from the
        // canonical copies owned by main, so a window reload doesn't lose
        // history or reset the filter toggle.
        Promise.all([window.api.getOptions(), window.api.getInitialEvents()]).then(
            ([opts, events]) => {
                if (cancelled) return;
                store.setFilterValidEvents(opts.filterValidEvents);
                store.setPaused(opts.paused);
                store.ingestEvents(events);
            },
        );

        // Live updates: each push from main is appended to the store and
        // the list updates without any DOM-side juggling.
        const unsubEvent = window.api.onEvent((event) => {
            useStore.getState().ingestEvents([event]);
        });
        const unsubReady = window.api.onServerReady((info) => {
            useStore.getState().setServerInfo(info);
        });

        return () => {
            cancelled = true;
            unsubEvent();
            unsubReady();
        };
    }, []);

    // Global keyboard shortcuts. ⌘F focuses the in-event search,
    // ⌘⇧F focuses the sidebar filter. Bound on window rather than
    // per-input so users can hit the shortcut anywhere in the app and
    // land in the right field even if focus is currently elsewhere.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod || e.key.toLowerCase() !== "f") return;
            e.preventDefault();
            focusSearch(e.shiftKey ? "list-filter" : "event-search");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <div
            class="grid h-full bg-surface"
            style="grid-template-rows: 44px 1fr 26px"
        >
            <HeaderToolbar />
            <PaneGroup sidebar={<EventList />} details={<EventDetails />} />
            <FooterToolbar />
        </div>
    );
}
