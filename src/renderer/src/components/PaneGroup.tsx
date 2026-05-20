import type { ComponentChildren } from "preact";

interface Props {
    sidebar: ComponentChildren;
    details: ComponentChildren;
}

// Two-column shell. The sidebar holds the virtualised event list, the
// details column holds the inspector for the selected event. Both
// columns are min-height: 0 so their children can scroll independently
// inside the parent grid's row.
export function PaneGroup({ sidebar, details }: Props) {
    return (
        <main
            class="grid min-h-0"
            style="grid-template-columns: 320px 1fr"
        >
            <aside
                class="min-h-0 flex flex-col border-r border-border bg-elevated overflow-hidden"
                aria-label="Captured events"
            >
                {sidebar}
            </aside>
            <section
                class="min-h-0 overflow-auto bg-surface"
                aria-label="Event details"
            >
                {details}
            </section>
        </main>
    );
}
