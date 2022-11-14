"use strict";

class ValidatedSnowplowObject {
    constructor(obj) {
        this.obj = obj;
        this.validationStatus = undefined;
        this.errors = undefined;
    }

    get() {
        return this.obj;
    }

    getValidationStatus() {
        return this.validationStatus;
    }

    getErrors() {
        return this.errors;
    }

    updateValidation(validationStatus, errors) {
        this.validationStatus = validationStatus;
        this.errors = validationStatus === "valid" ? undefined : errors;
    }

    toString() {
        return JSON.stringify(this);
    }

    getSchemaName() {
        return typeof this.obj.schema !== "undefined" ? this.obj.schema.split("/")[1] : "";
    }

    getSchemaVersion() {
        return typeof this.obj.schema !== "undefined" ? this.obj.schema.split("/")[3] : "";
    }
}

module.exports = ValidatedSnowplowObject;
