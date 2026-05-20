import type { JSX, Ref } from "preact";
import { cn } from "../../lib/cn";

export type InputProps = JSX.IntrinsicElements["input"] & {
    // Callers that need to focus the input from outside (e.g. a global
    // keyboard shortcut) pass a ref through this prop. Done as a regular
    // prop instead of forwardRef so the types line up cleanly under
    // Preact compat — the wrapped <input> simply binds to it.
    inputRef?: Ref<HTMLInputElement>;
};

// Base text input. Search-as-you-type inputs and numeric form fields
// both render through this; variants live in the call site via `class`
// (e.g. the search field gets a leading icon, the port field is
// tabular-nums). Keeping the variants out of cva for now since we only
// have two consumers and they need different layouts around the input.
export function Input({ class: className, type = "text", inputRef, ...rest }: InputProps) {
    return (
        <input
            ref={inputRef}
            type={type}
            class={cn(
                "h-7 px-2",
                "rounded-sm border border-border",
                "bg-sunken text-fg",
                "focus:outline-none focus:border-accent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "[&::-webkit-search-cancel-button]:appearance-none",
                className as string | undefined,
            )}
            {...rest}
        />
    );
}
