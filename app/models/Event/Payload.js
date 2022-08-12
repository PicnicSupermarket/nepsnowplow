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
        if (this.data.schema !== undefined) {
            return this.data.schema.split("/")[1];
        } else if (this.data.action !== undefined) {
            return this.data.action;
        }
    }

    getSchemaVersion() {
        if (this.data.schema !== undefined) {
            return this.data.schema.split("/")[3];
        }

        return 'n/a'
    }

    getSchemaValidity() {
        if (this.isValid === true) {
            return "positive";
        } else if (this.isValid === false) {
            return "negative";
        }
        return "warning";
    }
}

module.exports = Payload;
