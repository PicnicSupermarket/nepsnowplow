#!/usr/bin/node
"use strict";

const { remote } = require("electron");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const jsonfile = require("jsonfile");

const networkInterfaces = require("./networkInterfaces");
const base64Decode = require("./base64Decode");
const SnowplowEvent = require("./model/SnowplowEvent");
const ValidationSchema = require("./model/ValidationSchema");
const appLogger = require("./appLogger");

var server = express();
server.use(bodyParser.json()); // to parse application/json
server.use(bodyParser.urlencoded({ extended: true })); // to parse application/x-www-form-urlencoded

var schemas = {};
var schemaDir = remote.getGlobal("options").schemaDir;

function readSchema(file) {
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
                schema.self.version
            ].join("/");
            schemas[schemaName] = new ValidationSchema(schemaName, schema);
        } catch (err) {
            // catch non-valid JSON schemas
            console.log(file);
            console.log(err);
        }
    } else if (stats.isDirectory(file)) {
        let files = fs.readdirSync(file);
        files.forEach(function(f) {
            readSchema(path.join(file, f));
        });
    }
}

if (!!schemaDir) {
    // in production, remove app.asar from the path
    // cannot use process.resourcesPath in development,
    // as that will point to electron/dist in node_modules
    let resourcesPath = remote.app.getAppPath().replace("app.asar", "");
    readSchema(path.join(resourcesPath, schemaDir));
}

// Capturing every post events to this server
server.post("*", function(req, res) {
    let body = req.body;

    let bundle = body.data.reverse();
    bundle.forEach(function(data) {
        let context = JSON.parse(base64Decode(data.cx));
        let payload = JSON.parse(base64Decode(data.ue_px));

        let event = new SnowplowEvent(data.uid, payload, context);
        event.validate(schemas);

        appLogger.logEvent(event);
    });
    res.sendStatus(204);
});

// Start server
let port = remote.getGlobal("options").listeningPort;
server.listen(port, function() {
    let ifaces = networkInterfaces.getNetworkInterfacesIps();
    console.log("Listening for SnowPlow analytics on");
    ifaces.forEach(function(iface) {
        console.log(" - %s:%s", iface, port);
    });
    console.log("Please check you both of your devices are on the same network");
    console.log("________________________________________________________________________________");
    console.log("");
});
