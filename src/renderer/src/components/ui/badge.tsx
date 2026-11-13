import type { JSX } from "preact";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva(
    "inline-flex shrink-0 items-center px-2 py-px rounded-[10px] text-[11px] font-semibold leading-snug border border-transparent",
    {
        variants: {
            variant: {
                valid: "bg-ok/15 text-ok",
                invalid: "bg-bad/15 text-bad",
                unknown: "bg-warn/20 text-warn",
                neutral: "bg-sunken text-muted",
            },
        },
        defaultVariants: { variant: "neutral" },
    },
);

export type BadgeProps = JSX.HTMLAttributes<HTMLSpanElement> &
    VariantProps<typeof badgeVariants>;

export function Badge({ class: className, variant, ...rest }: BadgeProps) {
    return (
        <span
            class={cn(badgeVariants({ variant }), className as string | undefined)}
            {...rest}
        />
    );
}
