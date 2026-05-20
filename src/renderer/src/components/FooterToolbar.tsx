import { useStore } from "../store";

export function FooterToolbar() {
    const { ip, port } = useStore((s) => s.serverInfo);

    const ready = ip !== null && port > 0;
    const text = ready ? `${ip}:${port}` : "Waiting for collector…";

    return (
        <footer
            class="flex items-center gap-2 px-3 border-t border-border bg-elevated text-muted text-[11px]"
            aria-live="polite"
        >
            <span
                class={`w-2 h-2 rounded-full ${ready ? "bg-ok" : "bg-muted"}`}
                aria-hidden="true"
            />
            <span>{text}</span>
        </footer>
    );
}
