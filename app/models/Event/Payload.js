"use strict";
const renderjson = require("renderjson");

class Payload {
    constructor(data) {
        this.data = data.obj;
        this.errors = data.errors;
        this.validationStatus = data.validationStatus;
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

    getValidationStatus() {
        return this.validationStatus;
    }
}

module.exports = Payload;
