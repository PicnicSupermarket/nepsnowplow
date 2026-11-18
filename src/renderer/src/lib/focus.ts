// Tiny registry the search inputs hand themselves to so a global
// keydown handler can focus them without prop-drilling refs from
// the App down through HeaderToolbar and EventDetails. Both inputs
// register on mount and unregister on unmount.

type Target = "list-filter" | "event-search";

const refs: Partial<Record<Target, HTMLInputElement>> = {};

export function registerSearch(target: Target, el: HTMLInputElement | null): void {
    if (el) {
        refs[target] = el;
    } else {
        delete refs[target];
    }
}

export function focusSearch(target: Target): void {
    const el = refs[target];
    if (!el) return;
    el.focus();
    el.select();
}
