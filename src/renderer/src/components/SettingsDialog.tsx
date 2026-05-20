import { useEffect, useState } from "preact/hooks";
import { setListeningPort } from "../actions";
import { useStore } from "../store";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

interface Props {
    open: boolean;
    onClose(): void;
}

// Radix Dialog handles focus trapping, ESC dismiss, body scroll lock,
// and click-outside via the overlay. We only own the form state.
export function SettingsDialog({ open, onClose }: Props) {
    const currentPort = useStore((s) => s.serverInfo.port);
    const [portInput, setPortInput] = useState(String(currentPort || 3000));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Reset the form to the latest known port whenever the dialog
        // opens, in case the user closed without saving last time.
        if (open) {
            setPortInput(String(currentPort || 3000));
            setError(null);
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
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent>
                <form class="flex flex-col gap-4" onSubmit={handleSave}>
                    <DialogTitle>Settings</DialogTitle>

                    <label class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium">Listening port</span>
                        <input
                            type="number"
                            min={0}
                            max={65535}
                            value={portInput}
                            onInput={(e) =>
                                setPortInput((e.target as HTMLInputElement).value)
                            }
                            autofocus
                            class="h-7 px-2 rounded-sm border border-border bg-sunken text-fg tabular-nums focus:outline-none focus:border-accent"
                        />
                        <span class="text-[11px] text-muted">
                            Port the Snowplow collector listens on. Use 0 to let the
                            OS pick a free port automatically.
                        </span>
                    </label>

                    {error && (
                        <div class="px-3 py-2 rounded-sm bg-bad/10 border border-bad/30 text-bad text-xs">
                            {error}
                        </div>
                    )}

                    <div class="flex justify-end gap-2">
                        <Button onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
