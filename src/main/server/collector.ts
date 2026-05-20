import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import type { Server as HttpServer } from "node:http";
import { decode } from "./base64";
import { SnowplowMicro, MicroBadEvent, MicroGoodEvent } from "./snowplow-micro";
import { buildEventViewModel, SchemaEnvelope, DecodedEvent } from "./event-builder";
import type { EventViewModel } from "../../shared/event";

// One entry inside a `body.data` array as sent by a Snowplow tracker.
// `cx` is the base64-encoded `co` (contexts envelope), `ue_pr` / `ue_px`
// carry the optional unstructured-event envelope (plain / base64), and
// `se_*` carry structured-event fields.
interface BundleEntry {
    eid: string;
    cx: string;
    uid?: string;
    ue_pr?: string;
    ue_px?: string;
    se_ca?: string;
    se_ac?: string;
    se_pr?: string;
    se_la?: string;
    se_va?: string;
    [key: string]: string | undefined;
}

interface Bundle {
    data: BundleEntry[];
}

const STRUCTURED_FIELDS: Record<string, string> = {
    se_ca: "category",
    se_ac: "action",
    se_pr: "property",
    se_la: "label",
    se_va: "value",
};

export interface CollectorOptions {
    resourcesPath: string;
    proposedPort: number;
    onEvent(event: EventViewModel): void;
    onReady(actualPort: number): void;
    nextId(): number;
}

export class Collector {
    private readonly app = express();
    private readonly micro: SnowplowMicro;
    private server: HttpServer | null = null;
    // Serializes validate → fetch → reset against snowplow-micro so each
    // POST only sees its own bundle's results, not the accumulated session
    // history. Without this the micro retrieval would be O(total events).
    private validationQueue: Promise<void> = Promise.resolve();

    constructor(private readonly opts: CollectorOptions) {
        this.micro = new SnowplowMicro(opts.resourcesPath);
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        // Match every path so a tracker pointed at any URL on this host is
        // captured. Express 5 / path-to-regexp v8 no longer accept the bare
        // "*" string, so we hand it a regex.
        this.app.post(/.*/, (req, res) => {
            void this.handleEvent(req, res);
        });
    }

    async start(): Promise<void> {
        await this.micro.start();
        await this.listen(this.opts.proposedPort);
    }

    stop(): void {
        this.server?.close();
        this.server = null;
        this.micro.stop();
    }

    private listen(proposedPort: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const listener = this.app.listen(proposedPort, () => {
                const addr = listener.address();
                const actualPort = typeof addr === "object" && addr ? addr.port : proposedPort;
                this.server = listener;
                this.opts.onReady(actualPort);
                resolve();
            });
            listener.on("error", (err: NodeJS.ErrnoException) => {
                if (err.code === "EADDRINUSE" && proposedPort !== 0) {
                    // Fall back to an OS-assigned port so the app stays
                    // usable when something else already holds the
                    // configured one.
                    this.listen(0).then(resolve, reject);
                } else {
                    reject(err);
                }
            });
        });
    }

    private async handleEvent(req: Request, res: Response): Promise<void> {
        const body = req.body as Bundle | undefined;
        if (!body?.data) {
            res.sendStatus(400);
            return;
        }

        // Newest-first so the renderer's list grows downward in
        // chronological order when we push events one at a time.
        const bundle = [...body.data].reverse();

        let badEvents: MicroBadEvent[] = [];
        let goodEvents: MicroGoodEvent[] = [];

        const validation = this.validationQueue.then(async () => {
            try {
                await this.micro.validate(body);
                const [bad, good] = await Promise.all([
                    this.micro.retrieveBadEvents(),
                    this.micro.retrieveGoodEvents(),
                ]);
                badEvents = bad;
                goodEvents = good;
            } catch (err) {
                console.error("snowplow-micro validation failed", err);
            } finally {
                try {
                    await this.micro.reset();
                } catch (err) {
                    console.error("snowplow-micro reset failed", err);
                }
            }
        });
        // Swallow rejections on the shared chain so one failure can't
        // poison every subsequent request.
        this.validationQueue = validation.catch(() => undefined);
        await validation;

        for (const entry of bundle) {
            const decoded = this.decodeBundleEntry(entry);
            const view = buildEventViewModel(this.opts.nextId(), decoded, badEvents, goodEvents);
            this.opts.onEvent(view);
        }

        res.sendStatus(204);
    }

    private decodeBundleEntry(entry: BundleEntry): DecodedEvent {
        const payloadEnvelope = this.extractPayload(entry);
        const contextsRaw = JSON.parse(decode(entry.cx)) as
            | { data?: SchemaEnvelope[] }
            | SchemaEnvelope[];
        const contexts = Array.isArray(contextsRaw)
            ? contextsRaw
            : Array.isArray(contextsRaw.data)
              ? contextsRaw.data
              : [];
        return { eid: entry.eid, payload: payloadEnvelope, contexts };
    }

    private extractPayload(entry: BundleEntry): SchemaEnvelope {
        if (entry.ue_pr !== undefined) {
            const parsed = JSON.parse(entry.ue_pr) as SchemaEnvelope;
            return this.unwrap(parsed);
        }
        if (entry.ue_px !== undefined) {
            const parsed = JSON.parse(decode(entry.ue_px)) as SchemaEnvelope;
            return this.unwrap(parsed);
        }
        // Structured event: no schema, just the labelled fields.
        const data: Record<string, string> = {};
        for (const [k, v] of Object.entries(STRUCTURED_FIELDS)) {
            const raw = entry[k];
            if (raw !== undefined) data[v] = raw;
        }
        return { data };
    }

    private unwrap(envelope: SchemaEnvelope): SchemaEnvelope {
        // Some trackers wrap the schema envelope in another `{ data: ... }`
        // layer; peel one off when present so the builder sees the
        // canonical `{ schema, data }` shape.
        if (
            envelope.data &&
            typeof envelope.data === "object" &&
            !Array.isArray(envelope.data) &&
            "schema" in (envelope.data as object)
        ) {
            return envelope.data as SchemaEnvelope;
        }
        return envelope;
    }
}
