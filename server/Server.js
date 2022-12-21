const remote = require("@electron/remote");
const express = require("express");
const bodyParser = require("body-parser");

const base64 = require("./base64");
const SnowplowEvent = require("./model/SnowplowEvent");
const appLogger = require("./appLogger");
const SnowplowMicroServer = require("./SnowplowMicroServer");
const { Logger } = require("./utils");

class Server {
    constructor() {
        this.snowplowMicroServer = new SnowplowMicroServer(remote.app.getAppPath());
        this.instance = express();
        this.instance.use(bodyParser.json()); // to parse application/json
        this.instance.use(bodyParser.urlencoded({ extended: true })); // to parse application/x-www-form-urlencoded
    }

    start() {
        this.snowplowMicroServer.start();
        this.captureEvents();
        this.listen(remote.getGlobal("options").listeningPort);

        return this.instance;
    }

    resetEvents() {
        this.snowplowMicroServer.resetEvents();
    }

    getListeningPort() {
        return remote.getGlobal("options").listeningPort;
    }

    setListeningPort(port) {
        remote.getGlobal("options").listeningPort = port;
    }

    getInstance() {
        return this.instance;
    }

    listen(proposedPort) {
        const server = this;
        const listener = this.instance
            .listen(proposedPort, () => {
                const actualPort = listener.address().port;
                this.setListeningPort(actualPort);
                this.handleStartup(actualPort);
            })
            .on("error", (err) => {
                if (err.code === "EADDRINUSE") {
                    Logger.info(`Port ${proposedPort} in use, using random available port`);
                    server.listen(0);
                } else {
                    Logger.info(err);
                }
            });
    }

    handleStartup(port) {
        this.instance.emit("ready", port);
        Logger.info(`Listening for Snowplow analytics on port ${port}`);
        Logger.info("Please check that both of your devices are on the same network");
        Logger.info(
            "________________________________________________________________________________"
        );
        Logger.info("");
    }

    async handleEvent(request, response) {
        const { body } = request;

        if (!body || !body.data) {
            response.sendStatus(400);
            return;
        }

        const bundle = body.data.reverse();

        let badEvents = [];
        let goodEvents = [];

        try {
            await this.snowplowMicroServer.validateEvent(body);
            const [badEventResponse, goodEventResponse] = await Promise.all([
                this.snowplowMicroServer.retrieveBadEvents(),
                this.snowplowMicroServer.retrieveGoodEvents(),
            ]);

            badEvents = badEventResponse.data;
            goodEvents = goodEventResponse.data;
        } catch (error) {
            Logger.error(error);
        }

        const that = this;
        bundle.forEach((data) => {
            const context = JSON.parse(base64.decode(data.cx));

            const payload = that.getPayload(data);

            const event = new SnowplowEvent(data.uid, payload, context);

            const badEvent = badEvents.find((e) => e.rawEvent?.parameters.eid === data.eid);
            const goodEvent = goodEvents.find((e) => e.rawEvent?.parameters.eid === data.eid);

            event.setValidationResult(badEvent, goodEvent);

            appLogger.logEvent(event);
        });
        response.sendStatus(204);
    }

    getPayload(data) {
        return this.getUnstructuredPayload(data) || this.getStructuredPayload(data) || {};
    }

    getUnstructuredPayload(data) {
        if (data.ue_pr !== undefined) {
            return JSON.parse(data.ue_pr);
        }
        if (data.ue_px !== undefined) {
            return JSON.parse(base64.decode(data.ue_px));
        }
        return undefined;
    }

    getStructuredPayload(data) {
        const payload = {};
        const values = {
            se_ca: "category",
            se_ac: "action",
            se_pr: "property",
            se_la: "label",
            se_va: "value",
        };

        Object.entries(values).forEach((entry) => {
            const [key, value] = entry;
            if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
                payload[value] = data[key];
            }
        });

        return payload;
    }

    captureEvents() {
        // Capturing every post event sent to this server
        const { schemas } = this;
        this.instance.post("*", (req, res) => this.handleEvent(req, res, schemas));
    }
}

module.exports = Server;
