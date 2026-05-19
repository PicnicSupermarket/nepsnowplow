import { useEffect } from "preact/hooks";
import { HeaderToolbar } from "./components/HeaderToolbar";
import { FooterToolbar } from "./components/FooterToolbar";
import { PaneGroup } from "./components/PaneGroup";
import { useStore } from "./store";

export function App() {
    useEffect(() => {
        // Tag the root for platform-specific chrome (currently used to
        // reserve space for the macOS traffic light buttons).
        document.documentElement.dataset.platform = window.api.platform;

        // Seed the renderer-side filterValidEvents from the canonical copy
        // owned by main, so a window reload doesn't reset the toggle.
        let cancelled = false;
        window.api.getOptions().then((opts) => {
            if (!cancelled) {
                useStore.getState().setFilterValidEvents(opts.filterValidEvents);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div class="app">
            <HeaderToolbar />
            <PaneGroup
                sidebar={<EmptySidebar />}
                details={<EmptyDetails />}
            />
            <FooterToolbar />
        </div>
    );
}

function EmptySidebar() {
    return <div class="empty">No events yet</div>;
}

function EmptyDetails() {
    return <div class="empty">Select an event to inspect it</div>;
}
