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

class Server {
    constructor() {
        this.schemas = {};
        this.schemaDir = remote.getGlobal("options").schemaDir;

        this.instance = express();
        this.instance.use(bodyParser.json()); // to parse application/json
        this.instance.use(bodyParser.urlencoded({ extended: true })); // to parse application/x-www-form-urlencoded
    }

    start() {
        this.readSchemas();
        this.captureEvents();
        this.listen(remote.getGlobal("options").listeningPort);

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

    readSchemas() {
        if (!!this.schemaDir) {
            // in production, remove app.asar from the path
            // cannot use process.resourcesPath in development,
            // as that will point to electron/dist in node_modules
            let resourcesPath = remote.app.getAppPath().replace("app.asar", "");
            this.readSchema(path.join(resourcesPath, this.schemaDir));
        }
    }

    readSchema(file) {
        let stats;
        try {
            stats = fs.lstatSync(file);
        } catch (err) {
            // catch in case the file or directory could not be resolved,
            // when e.g. somebody deleted the schemas folder
            console.log(err);
            return;
        }

        if (stats.isFile() && (path.extname(file) === "" || path.extname(file) === ".json")) {
            // only accept .json or no extension
            try {
                let schema = jsonfile.readFileSync(file);
                let schemaName = [
                    schema.self.vendor,
                    schema.self.name,
                    schema.self.format,
                    schema.self.version,
                ].join("/");
                this.schemas[schemaName] = new ValidationSchema(schemaName, schema);
            } catch (err) {
                // catch non-valid JSON schemas
                console.log(file);
                console.log(err);
            }
        } else if (stats.isDirectory(file)) {
            let files = fs.readdirSync(file);
            files.forEach((f) => {
                this.readSchema(path.join(file, f));
            }, this);
        }
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

    handleEvent(request, response, schemas) {
        let body = request.body;

        let bundle = body.data.reverse();
        bundle.forEach(function (data) {
            let context = JSON.parse(base64.decode(data.cx));

            let payload = this.getPayload(data);

            let event = new SnowplowEvent(data.uid, payload, context);
            event.validate(schemas);

            appLogger.logEvent(event);
        });
        response.sendStatus(204);
    }

    getPayload(event) {
        let payload = {};
        if (event.ue_pr !== undefined) {
            payload = JSON.parse(event.ue_px);
        } else if (event.ue_px !== undefined) {
            payload = JSON.parse(base64.decode(event.ue_px));
        } else if (event.se_ca !== undefined && event.se_ac !== undefined) {
            payload = {
                category: event.se_ca,
                action: event.se_ac,
            };
        }

        return payload;
    }

    captureEvents() {
        // Capturing every post event sent to this server
        let schemas = this.schemas;
        this.instance.post("*", (req, res) => this.handleEvent(req, res, schemas));
    }
}

module.exports = Server;
