#!/usr/bin/node
"use strict";

const { remote } = require("electron");
const express = require("express");
const bodyParser = require("body-parser");

const base64 = require("./base64");
const SnowplowEvent = require("./model/SnowplowEvent");
const appLogger = require("./appLogger");
const SchemaLoader = require("./SchemaLoader");

var server = express();
server.use(bodyParser.json()); // to parse application/json
server.use(bodyParser.urlencoded({ extended: true })); // to parse application/x-www-form-urlencoded

SchemaLoader.on("schemas-loaded", (schemas) => {
    // Capturing every post events to this server
    server.post("*", function(req, res) {
        let body = req.body;

        let bundle = body.data.reverse();
        bundle.forEach(function(data) {
            let context = JSON.parse(base64.decode(data.cx));
            let payload = JSON.parse(base64.decode(data.ue_px));

            let event = new SnowplowEvent(data.uid, payload, context);
            event.validate(schemas);

            appLogger.logEvent(event);
        });
        res.sendStatus(204);
    });
});

// Start server
let port = remote.getGlobal("options").listeningPort;
server.listen(port, function() {
    console.log("Listening for SnowPlow analytics on port " + port);
    console.log("Please check you both of your devices are on the same network");
    console.log("________________________________________________________________________________");
    console.log("");
});

SchemaLoader.syncSchemas();
