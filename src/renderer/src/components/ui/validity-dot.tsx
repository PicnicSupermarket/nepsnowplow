import type { JSX } from "preact";
import { cva, type VariantProps } from "class-variance-authority";
import type { ValidationStatus } from "../../../../shared/event";
import { cn } from "../../lib/cn";

const dotVariants = cva("shrink-0 w-2 h-2 rounded-full", {
    variants: {
        status: {
            valid: "bg-ok",
            invalid: "bg-bad",
            unknown: "bg-warn",
        },
    },
    defaultVariants: { status: "unknown" },
});

export interface ValidityDotProps
    extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "status">,
        VariantProps<typeof dotVariants> {
    status: ValidationStatus;
}

export function ValidityDot({ class: className, status, ...rest }: ValidityDotProps) {
    return (
        <span
            class={cn(dotVariants({ status }), className as string | undefined)}
            aria-label={status}
            {...rest}
        />
    );
}
