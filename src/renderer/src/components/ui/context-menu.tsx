import type { ComponentChildren, JSX } from "preact";
import { useEffect } from "preact/hooks";

// Minimal right-click popup menu. Positioned at the cursor (callers
// pass the original event's clientX/clientY), dismissed on click
// outside or ESC. Renders inline rather than via a portal — it's
// position: fixed so the surrounding overflow doesn't matter.

interface ContextMenuProps {
    open: boolean;
    x: number;
    y: number;
    onClose(): void;
    children: ComponentChildren;
}

export function ContextMenu({ open, x, y, onClose, children }: ContextMenuProps) {
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target?.closest("[data-context-menu]")) {
                onClose();
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        // Capture-phase mousedown so the click that opened the menu
        // (already bubbled to document by the time React commits) isn't
        // immediately treated as an outside click that closes it.
        window.addEventListener("mousedown", onDown, true);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("mousedown", onDown, true);
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            data-context-menu
            role="menu"
            class="fixed z-50 min-w-[200px] py-1 rounded border border-border bg-elevated shadow-[0_6px_24px_rgba(0,0,0,0.18)]"
            style={{ left: `${x}px`, top: `${y}px` }}
        >
            {children}
        </div>
    );
}

interface ItemProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "onSelect"> {
    onSelect(): void;
}

export function ContextMenuItem({ onSelect, children, class: className, ...rest }: ItemProps) {
    return (
        <button
            type="button"
            role="menuitem"
            class={`w-full text-left px-3 py-1.5 text-xs cursor-pointer hover:bg-sunken focus:bg-sunken focus:outline-none ${className ?? ""}`}
            onClick={() => onSelect()}
            {...rest}
        >
            {children}
        </button>
    );
}

export function ContextMenuSeparator() {
    return <div role="separator" class="my-1 h-px bg-border" />;
}
