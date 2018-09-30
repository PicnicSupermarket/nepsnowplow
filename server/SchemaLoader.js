"use strict";
const EventEmitter = require("events");
const { remote } = require("electron");
const logger = require("electron-log");
const jsonfile = require("jsonfile");
const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");

const ValidationSchema = require("./model/ValidationSchema");

class SchemaLoader extends EventEmitter {
    constructor() {
        super();

        this.on("schemas-synced", function() {
            this.loadLocalSchemas();
        });
    }

    syncSchemas() {
        let repos = remote.getGlobal("options").repos;

        (repos || [])
            .filter((repo) => {
                return !!repo.url && !!repo.apikey && !!repo.vendors && repo.vendors.length > 0;
            })
            .forEach((repo) => {
                logger.info("Syncing " + repo.vendors + " schemas from " + repo.url);

                const req = new XMLHttpRequest();
                let endpoint = "/api/schemas/" + repo.vendors.join("%2C");
                req.open("GET", repo.url + endpoint);
                req.setRequestHeader("apikey", repo.apikey);
                req.onreadystatechange = function() {
                    if (req.readyState === XMLHttpRequest.DONE) {
                        // Request was sent, response is downloaded and operation is complete.
                        if ((req.status >= 200 && req.status <= 300) || req.status === 304) {
                            this.storeSchemas(JSON.parse(req.responseText));
                        } else if (req.status > 0) {
                            // Could load the url, but found unexpected status.
                            console.error(
                                "Could not fetch schemas: " +
                                    repo.url +
                                    endpoint +
                                    " returned status " +
                                    req.status
                            );
                        }
                    }
                }.bind(this);
                req.send();
            });
        logger.info("Schema syncing done");
        this.emit("schemas-synced");
    }

    storeSchemas(schemas) {
        schemas.forEach((schema) => {
            let content = JSON.stringify(schema);
            let schemaPath = path.join(this.getSchemasPath(), this.getNameFromSchema(schema));

            // Create folders recursively, if they don't already exist.
            mkdirp(path.dirname(schemaPath), function(mkdirError) {
                if (mkdirError) {
                    console.log(mkdirError);
                    return;
                }

                // Save schemas to disk, only if it doesn't exist already.
                fs.writeFile(schemaPath, content, { flag: "wx" }, function(writeError) {
                    // Skip error logging when file already exists.
                    if (writeError && writeError.code !== "EEXIST") {
                        console.log(writeError);
                        return;
                    }
                });
            });
        }, this);
    }

    getNameFromSchema(schema) {
        // prettier-ignore
        return [
            schema.self.vendor,
            schema.self.name,
            schema.self.format,
            schema.self.version
        ].join("/");
    }

    getSchemasPath() {
        let schemaDir = remote.getGlobal("options").schemaDir;
        // in production, remove app.asar from the path
        // cannot use process.resourcesPath in development,
        // as that will point to electron/dist in node_modules
        let resourcesPath = remote.app.getAppPath().replace("app.asar", "");
        return !!schemaDir && path.join(resourcesPath, schemaDir);
    }

    loadLocalSchemas() {
        let schemasPath = this.getSchemasPath();
        let schemas = this.readSchema(schemasPath, {});
        logger.info("Schemas loaded from disk");
        this.emit("schemas-loaded", schemas);
    }

    readSchema(file, schemas) {
        let stats;
        try {
            stats = fs.lstatSync(file);
        } catch (err) {
            // catch in case the file or directory could not be resolved,
            // when e.g. somebody deleted the schemas folder
            console.log(err);
            return schemas;
        }

        if (stats.isFile() && (path.extname(file) === "" || path.extname(file) === ".json")) {
            // only accept .json or no extension
            try {
                let schema = jsonfile.readFileSync(file);
                let schemaName = this.getNameFromSchema(schema);
                schemas[schemaName] = new ValidationSchema(schemaName, schema);
            } catch (err) {
                // catch non-valid JSON schemas
                console.log(file + ": " + err);
            }
        } else if (stats.isDirectory(file)) {
            let files = fs.readdirSync(file);
            files.forEach(function(f) {
                schemas = this.readSchema(path.join(file, f), schemas);
            }, this);
        }
        return schemas;
    }
}

module.exports = new SchemaLoader();
