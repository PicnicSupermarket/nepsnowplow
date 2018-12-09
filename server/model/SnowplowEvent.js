"use strict";
const ValidatedSnowplowObject = require("./ValidatedSnowplowObject");

class SnowplowEvent {
    constructor(userId, payload, ctxs) {
        this.userId = userId;
        this.payload = new ValidatedSnowplowObject(payload.data || payload);
        this.contexts = (ctxs.data || ctxs).map((ctx) => {
            return new ValidatedSnowplowObject(ctx);
        });
    }

    validate(schemas) {
        function validateSnowplowObject(obj, schemas) {
            try {
                obj.validate(schemas[obj.get().schema.replace("iglu:", "")]);
            } catch (err) {
                console.log("Unable to validate Snowplow Object", obj, "using schemas", schemas);
                console.log(err);
            }
        }

        validateSnowplowObject(this.payload, schemas);
        this.contexts.forEach((ctx) => {
            validateSnowplowObject(ctx, schemas);
        });
    }

    toString() {
        return JSON.stringify(this);
    }

    getSchemaName() {
        return this.payload.getSchemaName();
    }
}

module.exports = SnowplowEvent;
