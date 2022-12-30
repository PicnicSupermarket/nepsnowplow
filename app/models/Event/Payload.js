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
        if (this.data.schema !== undefined) {
            return this.data.schema.split("/")[1];
        }
        if (this.data.action !== undefined) {
            return this.data.action;
        }
        return undefined;
    }

    getSchemaVersion() {
        if (this.data.schema !== undefined) {
            return this.data.schema.split("/")[3];
        }
        return undefined;
    }

    getValidationStatus() {
        return this.validationStatus;
    }
}

module.exports = Payload;
