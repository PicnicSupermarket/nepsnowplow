import { useEffect, useState } from "preact/hooks";
import type { Options } from "../../shared/ipc";

export function App() {
    const [options, setOptions] = useState<Options | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        window.api
            .getOptions()
            .then(setOptions)
            .catch((err: unknown) => setError(String(err)));
    }, []);

    return (
        <div class="placeholder">
            <h1>NepperSnowplow</h1>
            <p>Phase 1 scaffold — IPC bridge is live.</p>
            {error && <pre class="error">{error}</pre>}
            {options && (
                <pre class="options">{JSON.stringify(options, null, 2)}</pre>
            )}
        </div>
    );
}
