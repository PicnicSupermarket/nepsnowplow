"use strict";

const remote = require("@electron/remote");
const express = require("express");
const bodyParser = require("body-parser");

const base64 = require("./base64");
const SnowplowEvent = require("./model/SnowplowEvent");
const appLogger = require("./appLogger");
const SnowplowMicroServer = require("./SnowplowMicroServer");

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
        let server = this;
        let listener = this.instance
            .listen(proposedPort, () => {
                let actualPort = listener.address().port;
                this.setListeningPort(actualPort);
                this.handleStartup(actualPort);
            })
            .on("error", (err) => {
                if (err.code === "EADDRINUSE") {
                    console.log(`Port ${proposedPort} in use, using random available port`);
                    server.listen(0);
                } else {
                    console.log(err);
                }
            });
    }

    handleStartup(port) {
        this.instance.emit("ready", port);
        console.log("Listening for Snowplow analytics on port " + port);
        console.log("Please check that both of your devices are on the same network");
        console.log(
            "________________________________________________________________________________"
        );
        console.log("");
    }

    captureEvents() {
        // Capturing every post event sent to this server
        const snowplowMicroServer = this.snowplowMicroServer;
        this.instance.post("*", async function (req, res) {
            var badEvents = [];
            var goodEvents = [];

            try {
                await snowplowMicroServer.validateEvent(req.body);
                const [badEventResponse, goodEventResponse] = await Promise.all([
                    snowplowMicroServer.retrieveBadEvents(),
                    snowplowMicroServer.retrieveGoodEvents(),
                ]);

                badEvents = badEventResponse.data;
                goodEvents = goodEventResponse.data;
            } catch {}

            let body = req.body;

            let bundle = body.data.reverse();
            bundle.forEach(function (data) {
                const context = JSON.parse(base64.decode(data.cx));
                const payload = JSON.parse(base64.decode(data.ue_px));

                const event = new SnowplowEvent(data.uid, payload, context);

                const badEvent = badEvents.find(
                    (event) => event.rawEvent.parameters.eid === data.eid
                );

                const goodEvent = goodEvents.find(
                    (event) => event.rawEvent.parameters.eid === data.eid
                );

                event.setValidationResult(badEvent, goodEvent);

                appLogger.logEvent(event);
            });

            res.sendStatus(204);
        });
    }
}

module.exports = Server;
