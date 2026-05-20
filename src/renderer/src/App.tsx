import { useEffect } from "preact/hooks";
import { HeaderToolbar } from "./components/HeaderToolbar";
import { FooterToolbar } from "./components/FooterToolbar";
import { PaneGroup } from "./components/PaneGroup";
import { EventList } from "./components/EventList";
import { EventDetails } from "./components/EventDetails";
import { useStore } from "./store";

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
