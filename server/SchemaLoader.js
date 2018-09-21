"use strict";

const EventEmitter = require("events");
const { remote } = require("electron");
const jsonfile = require("jsonfile");
const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");

const ValidationSchema = require("./model/ValidationSchema");

class SchemaLoader extends EventEmitter {
    constructor() {
        super();

        this.synced = this.syncSchemas();

        this.on("schemas-synced", function() {
            this.synced = true;
            this.loadLocalSchemas();
        });
    }

    syncSchemas() {
        if (this.synced) {
            this.emit("schemas-synced");
            return;
        }

        let repo = remote.getGlobal("options").repo;

        if (!!repo && !!repo.url && !!repo.apikey && !!repo.vendors && repo.vendors.length > 0) {
            let endpoint = "/api/schemas/" + repo.vendors.join("%2C");

            const req = new XMLHttpRequest();
            req.open("GET", repo.url + endpoint);
            req.setRequestHeader("apikey", repo.apikey);
            req.send();

            req.onreadystatechange = function() {
                if (req.readyState === 4 && req.status === 200) {
                    //done loading
                    this.storeSchemas(JSON.parse(req.responseText));
                    this.emit("schemas-synced");
                }
            }.bind(this);
        }
        return true;
    }

    storeSchemas(schemas) {
        schemas.forEach((schema) => {
            let content = JSON.stringify(schema);
            let schemaPath = path.join(this.getSchemasPath(), this.getNameFromSchema(schema));

            // create path (folders) if they don't exist
            mkdirp(path.dirname(schemaPath), function(mkdirError) {
                if (mkdirError) {
                    return console.log(mkdirError);
                }

                // save schemas to disk, only if it doesn't exist already
                fs.writeFile(schemaPath, content, { flag: "wx" }, function(writeError) {
                    if (writeError && writeError.code !== "EEXIST") {
                        return console.log(writeError);
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
        if (!!schemaDir) {
            // in production, remove app.asar from the path
            // cannot use process.resourcesPath in development,
            // as that will point to electron/dist in node_modules
            let resourcesPath = remote.app.getAppPath().replace("app.asar", "");
            return path.join(resourcesPath, schemaDir);
        }
        return false;
    }

    loadLocalSchemas() {
        let schemaPath = this.getSchemasPath();
        let schemas = {};
        if (!!schemaPath) {
            schemas = this.readSchema(schemaPath, schemas);
        }
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
            return;
        }

        if (stats.isFile() && (path.extname(file) === "" || path.extname(file) === ".json")) {
            // only accept .json or no extension
            try {
                let schema = jsonfile.readFileSync(file);
                let schemaName = this.getNameFromSchema(schema);
                schemas[schemaName] = new ValidationSchema(schemaName, schema);
            } catch (err) {
                // catch non-valid JSON schemas
                console.log(file);
                console.log(err);
            }
        } else if (stats.isDirectory(file)) {
            let files = fs.readdirSync(file);
            files.forEach(function(f) {
                this.readSchema(path.join(file, f), schemas);
            }, this);
        }
        return schemas;
    }
}

module.exports = new SchemaLoader();
