import { useEffect, useRef, useState } from "preact/hooks";
import { setListeningPort } from "../actions";
import { useStore } from "../store";

interface Props {
    open: boolean;
    onClose(): void;
}

// Settings dialog backed by the native <dialog> element. showModal()
// handles focus trapping, ESC-to-close, and inert background by itself,
// so we just track open/close state and the form fields.
export function SettingsDialog({ open, onClose }: Props) {
    const currentPort = useStore((s) => s.serverInfo.port);
    const ref = useRef<HTMLDialogElement>(null);
    const [portInput, setPortInput] = useState(String(currentPort || 3000));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            // Reset the form to the latest known port whenever the dialog
            // opens, in case the user closed without saving last time.
            setPortInput(String(currentPort || 3000));
            setError(null);
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open, currentPort]);

    async function handleSave(e: Event) {
        e.preventDefault();
        const port = Number(portInput);
        if (!Number.isInteger(port) || port < 0 || port > 65535) {
            setError("Port must be between 0 and 65535");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await setListeningPort(port);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    }

    return (
        <dialog ref={ref} class="dialog" onClose={onClose}>
            <form class="dialog__form" onSubmit={handleSave}>
                <h2 class="dialog__title">Settings</h2>

                <label class="dialog__field">
                    <span class="dialog__label">Listening port</span>
                    <input
                        type="number"
                        min={0}
                        max={65535}
                        value={portInput}
                        onInput={(e) => setPortInput((e.target as HTMLInputElement).value)}
                        autofocus
                    />
                    <span class="dialog__hint">
                        Port the Snowplow collector listens on. Use 0 to let the
                        OS pick a free port automatically.
                    </span>
                </label>

                {error && <div class="dialog__error">{error}</div>}

                <div class="dialog__actions">
                    <button
                        type="button"
                        class="btn"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button type="submit" class="btn btn--primary" disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </form>
        </dialog>
    );
}
