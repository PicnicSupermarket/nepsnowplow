import type { ComponentChildren, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { cn } from "../../lib/cn";

// shadcn-style API surface built on the native HTML <dialog> element.
// We started with Radix Dialog but its FocusScope hits a getComputedStyle
// path that isn't compatible with Preact's compat ref shim. The native
// element already gives us focus trapping, ESC dismiss, body scroll
// lock, and the ::backdrop pseudo for the overlay — at zero extra runtime
// cost.

interface DialogProps {
    open: boolean;
    onOpenChange(open: boolean): void;
    children: ComponentChildren;
}

// Top-level wrapper that owns the <dialog> imperative show/close calls.
// Children mount unconditionally so internal state (form values) doesn't
// reset when the dialog briefly closes during a transition.
export function Dialog({ open, onOpenChange, children }: DialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    function handleClose() {
        if (open) onOpenChange(false);
    }

    function handleClickOutside(e: MouseEvent) {
        // Native <dialog> doesn't dismiss on backdrop click; emulate it
        // by checking whether the mousedown target is the dialog element
        // itself (which is what the OS reports when the backdrop is hit).
        if (e.target === ref.current) {
            onOpenChange(false);
        }
    }

    return (
        <dialog
            ref={ref}
            onClose={handleClose}
            onClick={handleClickOutside}
            class={cn(
                "m-auto p-0 border-0 rounded-[10px]",
                "bg-elevated text-fg",
                "shadow-[0_16px_40px_rgba(0,0,0,0.18)]",
                "min-w-[360px] max-w-[480px]",
                "backdrop:bg-black/30 backdrop:backdrop-blur-[2px]",
            )}
        >
            {children}
        </dialog>
    );
}

// Content wrapper. Mostly here so the public API mirrors the shadcn /
// Radix shape — every Dialog gets a single Content child that owns the
// padding and flex layout for the form rows inside.
export function DialogContent({
    class: className,
    children,
    ...rest
}: JSX.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            class={cn(
                "p-5 flex flex-col gap-4 focus:outline-none",
                className as string | undefined,
            )}
            {...rest}
        >
            {children}
        </div>
    );
}

export function DialogTitle({
    class: className,
    ...rest
}: JSX.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 class={cn("m-0 text-sm font-semibold", className as string | undefined)} {...rest} />;
}

export function DialogDescription({
    class: className,
    ...rest
}: JSX.HTMLAttributes<HTMLParagraphElement>) {
    return <p class={cn("text-xs text-muted", className as string | undefined)} {...rest} />;
}
