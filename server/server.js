#!/usr/bin/node
const express = require("express");
const bodyParser = require("body-parser");
const jsonfile = require("jsonfile");
const fs = require("fs");
const path = require("path");

const appLogger = require("./logger/app_logger.js");
const SnowplowEvent = require("./model/snowplow_event.js");
const ValidationSchema = require("./model/validation_schema.js");
const networkInterfaces = require("./network_interfaces");
const base64Decode = require("./b64.js");

var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

var schemas = {};
var schemaDir = global.options.schemaDir;
if (!!schemaDir) {
    readSchema(path.join(__dirname, "..", schemaDir));
}

function readSchema(file) {
    let stats;
    try {
        stats = fs.lstatSync(file);
    } catch (err) {
        // catch in case when file or directory could not be resolved,
        // e.g. somebody deleted the schemas folder
        console.log(err);
        return;
    }

    if (
        stats.isFile() &&
        (path.extname(file) === "" || path.extname(file) === ".json")
    ) {
        // only accept .json or no extension
        try {
            let schemaName = file
                .substring(schemaDir.length)
                .replace(/\\/g, "/"); // force forard slashes irrespective of platform
            schemas[schemaName] = new ValidationSchema(
                schemaName,
                jsonfile.readFileSync(file)
            );
        } catch (err) {
            // catch non-valid JSON schemas
            console.log(err);
        }
    } else if (stats.isDirectory(file)) {
        var files = fs.readdirSync(file);
        files.forEach(function(f) {
            readSchema(path.join(file, f));
        });
    }
}

// Capturing every post events to this server
app.post("*", function(req, res) {
    var body = req.body;

    var bundle = body.data.reverse();
    bundle.forEach(function(data) {
        var context = JSON.parse(base64Decode(data.cx));
        var payload = JSON.parse(base64Decode(data.ue_px));

        var event = new SnowplowEvent(data.uid, payload, context);
        event.validate(schemas);

        appLogger.logEvent(event);
    });
    res.sendStatus(204);
});

// Start server
var port = global.options.listeningPort;
app.listen(port, function() {
    var ifaces = networkInterfaces.getNetworkInterfacesIps();
    console.log("Listening for SnowPlow analytics on");
    ifaces.forEach(function(iface) {
        console.log(" - %s:%s", iface, port);
    });
    console.log(
        "Please check you both of your devices are on the same network"
    );
    console.log(
        "________________________________________________________________________________"
    );
    console.log("");
});
