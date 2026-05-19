import { useStore } from "../store";

export function FooterToolbar() {
    const { ip, port } = useStore((s) => s.serverInfo);

    const ready = ip !== null && port > 0;
    const text = ready ? `${ip}:${port}` : "Waiting for collector…";

    return (
        <footer class="app-footer" aria-live="polite">
            <span class={`app-footer__status${ready ? " is-ready" : ""}`} />
            <span>{text}</span>
        </footer>
    );
}
