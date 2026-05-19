import type { ComponentChildren } from "preact";

interface Props {
    sidebar: ComponentChildren;
    details: ComponentChildren;
}

// Two-column split. Phase 3 fills the sidebar with the virtualised event
// list; Phase 4 fills the details column with the inspector. The layout
// itself stays simple — flex with a fixed-ish sidebar width feeding 1fr
// to the details column.
export function PaneGroup({ sidebar, details }: Props) {
    return (
        <main class="pane-group">
            <aside class="pane pane--sidebar" aria-label="Captured events">
                {sidebar}
            </aside>
            <section class="pane pane--details" aria-label="Event details">
                {details}
            </section>
        </main>
    );
}
