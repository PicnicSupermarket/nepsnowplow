#!/usr/bin/node
"use strict";

const { remote } = require("electron");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const jsonfile = require("jsonfile");

const base64 = require("./base64");
const SnowplowEvent = require("./model/SnowplowEvent");
const ValidationSchema = require("./model/ValidationSchema");
const appLogger = require("./appLogger");
const SchemaLoader = require("./SchemaLoader");

class Server {
    constructor() {
        this.schemaDir = remote.getGlobal("options").schemaDir;

        this.instance = express();
        this.instance.use(bodyParser.json()); // to parse application/json
        this.instance.use(bodyParser.urlencoded({ extended: true })); // to parse application/x-www-form-urlencoded
    }

    start() {
        SchemaLoader.on("schemas-loaded", (schemas) => {
            this.captureEvents(schemas);
            this.listen(remote.getGlobal("options").listeningPort);
        });
        SchemaLoader.syncSchemas();

        return this.instance;
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
                if (err.errno === "EADDRINUSE") {
                    console.log(`Port ${proposedPort} in use, using random available port`);
                    server.listen(0);
                } else {
                    console.log(err);
                }
            });
    }

    handleStartup(port) {
        this.instance.emit("ready", port);
        console.log("Listening for SnowPlow analytics on port " + port);
        console.log("Please check that both of your devices are on the same network");
        console.log(
            "________________________________________________________________________________"
        );
        console.log("");
    }

    captureEvents(schemas) {
        // Capturing every post event sent to this server
        this.instance.post("*", function(req, res) {
            let body = req.body;

            let bundle = body.data.reverse();
            bundle.forEach(function (data) {
                let context = JSON.parse(base64.decode(data.cx));
                let payload = JSON.parse(base64.decode(data.ue_px));

                let event = new SnowplowEvent(data.uid, payload, context);
                event.validate(schemas);

                appLogger.logEvent(event);
            });
            res.sendStatus(204);
        });
    }
}

module.exports = Server;
