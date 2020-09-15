"use strict";

class ValidationSchema {
    constructor(name, schema) {
        this.name = name;
        this.schema = schema;
        this.cleanSchema();
    }

    cleanSchema() {
        if (this.schema.required !== undefined && this.schema.required.length === 0) {
            delete this.schema.required;
        }
    }

    getSchema() {
        return this.schema;
    }

    toString() {
        return JSON.stringify(this);
    }
}

module.exports = ValidationSchema;
