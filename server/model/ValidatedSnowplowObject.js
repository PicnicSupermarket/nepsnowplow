"use strict";
const Validator = require("z-schema");

const validator = new Validator({
    ignoreUnresolvableReferences: true,
    breakOnFirstError: false,
});

class ValidatedSnowplowObject {
    constructor(obj) {
        this.obj = obj;
        this.isValid = undefined;
        this.errors = undefined;
    }

    get() {
        return this.obj;
    }

    isValid() {
        return this.isValid;
    }

    getErrors() {
        return this.errors;
    }

    validate(validationSchema) {
        if (typeof validationSchema !== "undefined") {
            // Allow events with no validation schemas
            let validationResult = validator.validate(this.obj.data, validationSchema.getSchema());
            this.errors = (validator.getLastErrors() || []).map(function (obj) {
                return obj.message;
            });
            this.isValid = validationResult;
        } else {
            this.isValid = undefined;
            this.errors = ["Unknown schema"];
        }
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
