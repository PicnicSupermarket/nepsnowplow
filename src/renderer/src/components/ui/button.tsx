import type { JSX } from "preact";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

// Visual variants the rest of the renderer composes against. The
// base layer covers the shared shape (size, focus ring, disabled,
// flex behaviour for icons + label); variants override colours.
const buttonVariants = cva(
    [
        "inline-flex items-center justify-center gap-1.5",
        "h-[26px] px-2.5 rounded-sm",
        "border border-border bg-elevated text-fg",
        "cursor-pointer select-none",
        "transition-[background-color,border-color,color] duration-100",
        "hover:bg-sunken",
        "active:bg-border",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-elevated",
        "[&_svg]:shrink-0",
    ].join(" "),
    {
        variants: {
            variant: {
                default: "",
                primary: [
                    "bg-accent border-accent text-white",
                    "hover:bg-[color-mix(in_srgb,var(--color-accent)_90%,black)]",
                    "active:bg-[color-mix(in_srgb,var(--color-accent)_80%,black)]",
                    "disabled:hover:bg-accent",
                ].join(" "),
                toggle: [
                    "data-[active=true]:bg-accent-soft",
                    "data-[active=true]:border-accent",
                    "data-[active=true]:text-accent",
                ].join(" "),
                ghost: "border-transparent text-muted hover:text-fg hover:bg-sunken",
            },
            size: {
                default: "",
                icon: "w-[26px] px-0",
            },
        },
        defaultVariants: { variant: "default", size: "default" },
    },
);

export type ButtonProps = JSX.IntrinsicElements["button"] &
    VariantProps<typeof buttonVariants> & {
        // When the toggle variant is selected, mirror its visual state via
        // the standard ARIA hook so screen readers know the press is
        // sticky and so the data-attribute selector on the variant has
        // something to bind.
        pressed?: boolean;
    };

export function Button({
    class: className,
    variant,
    size,
    pressed,
    type = "button",
    ...rest
}: ButtonProps) {
    return (
        <button
            type={type}
            class={cn(buttonVariants({ variant, size }), className as string | undefined)}
            data-active={pressed ? "true" : undefined}
            aria-pressed={variant === "toggle" ? Boolean(pressed) : rest["aria-pressed"]}
            {...rest}
        />
    );
}
