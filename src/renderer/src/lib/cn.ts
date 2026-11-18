import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// The shadcn convention: clsx joins truthy class fragments, twMerge
// resolves conflicting Tailwind utilities (e.g. a variant supplies
// `px-3` and a caller overrides with `px-1`, the latter wins instead
// of both surviving). Used by every component in components/ui.
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
