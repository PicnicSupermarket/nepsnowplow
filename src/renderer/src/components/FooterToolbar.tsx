import { useStore } from "../store";

export function FooterToolbar() {
    const { ip, port } = useStore((s) => s.serverInfo);
    const paused = useStore((s) => s.paused);

    const ready = ip !== null && port > 0;
    const address = ready ? `${ip}:${port}` : "Waiting for collector…";

    // Dot reflects collector state precedence: paused beats ready, so a
    // running but paused collector reads as paused (warn) rather than ok.
    const dotTone = !ready ? "bg-muted" : paused ? "bg-warn" : "bg-ok";

    return (
        <footer
            class="flex items-center gap-2 px-3 border-t border-border bg-elevated text-muted text-[11px]"
            aria-live="polite"
        >
            <span class={`w-2 h-2 rounded-full ${dotTone}`} aria-hidden="true" />
            <span>{address}</span>
            {ready && paused && (
                <span class="text-warn font-medium uppercase tracking-wider text-[10px]">
                    Paused
                </span>
            )}
        </footer>
    );
}
