"use strict";
const renderjson = require("renderjson");

class Payload {
    constructor(data) {
        this.data = data.obj;
        this.errors = data.errors;
        this.isValid = data.isValid;
    }

    getJson() {
        return renderjson(this.data);
    }

    getSchemaName() {
        return this.data.schema.split("/")[1];
    }

    getSchemaVersion() {
        return this.data.schema.split("/")[3];
    }

    getSchemaValidity() {
        if (typeof this.isValid === "undefined") {
            return "warning";
        } else if (this.isValid === true) {
            return "positive";
        } else if (this.isValid === false) {
            return "negative";
        }
    }
}

module.exports = Payload;
