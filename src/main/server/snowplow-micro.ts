import { spawn, ChildProcess } from "node:child_process";
import os from "node:os";
import path from "node:path";

// The shape of a `/micro/bad` entry that the validator surfaces. Only the
// fields the event builder touches are typed here; the rest of the payload
// is intentionally opaque.
export interface MicroBadEvent {
    rawEvent?: { parameters: { eid: string } };
    errors?: string[];
}

export interface MicroGoodEvent {
    rawEvent?: { parameters: { eid: string } };
}

// Manages the snowplow-micro JVM subprocess and provides typed wrappers
// around its HTTP API. Caller is expected to `await start()` exactly once
// and `stop()` on app shutdown.
export class SnowplowMicro {
    private process: ChildProcess | null = null;
    private port: number | null = null;
    private readonly readyPromise: Promise<void>;
    private resolveReady!: () => void;

    constructor(private readonly resourcesPath: string) {
        this.readyPromise = new Promise((resolve) => {
            this.resolveReady = resolve;
        });
    }

    start(): Promise<void> {
        const base = this.resourcesPath;
        const jarPath = path.join(base, "jars", "snowplow-micro-1.3.4.jar");
        const jrePath = path.join(base, `jre/${os.platform()}_${os.arch()}/bin/java`);
        const microConfPath = path.join(base, "snowplow_micro_config", "micro.conf");
        const igluPath = path.join(base, "snowplow_micro_config", "iglu.json");

        this.process = spawn(jrePath, [
            "-jar",
            jarPath,
            "--collector-config",
            microConfPath,
            "--iglu",
            igluPath,
        ]);
        this.process.on("error", (err) => {
            console.error("[snowplow-micro] spawn failed:", err);
        });

        // snowplow-micro logs `... :PORT ...` on stderr at startup. We pluck
        // the port out of the first match and consider the JVM ready then.
        this.process.stderr?.on("data", (chunk: Buffer) => {
            if (this.port !== null) return;
            const match = chunk.toString().match(/.*:(\d+).?/i);
            if (match?.[1]) {
                this.port = Number(match[1]);
                this.resolveReady();
            }
        });

        return this.readyPromise;
    }

    stop(): void {
        this.process?.kill();
        this.process = null;
        this.port = null;
    }

    async validate(payload: unknown): Promise<void> {
        await this.request("/com.snowplowanalytics.snowplow/tp2", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        });
    }

    async retrieveBadEvents(): Promise<MicroBadEvent[]> {
        const res = await this.request("/micro/bad");
        return (await res.json()) as MicroBadEvent[];
    }

    async retrieveGoodEvents(): Promise<MicroGoodEvent[]> {
        const res = await this.request("/micro/good");
        return (await res.json()) as MicroGoodEvent[];
    }

    async reset(): Promise<void> {
        await this.request("/micro/reset");
    }

    private async request(endpoint: string, init?: RequestInit): Promise<Response> {
        if (this.port === null) {
            throw new Error("Snowplow Micro is not ready");
        }
        return fetch(`http://localhost:${this.port}${endpoint}`, init);
    }
}
