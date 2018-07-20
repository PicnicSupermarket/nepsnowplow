"use strict";
const ValidatedSnowplowObject = require("./validated_snowplow_object.js");

class SnowplowEvent {
    constructor(userId, payload, ctxs) {
        this.userId = userId;
        this.payload = new ValidatedSnowplowObject(payload.data || payload);
        this.contexts = (ctxs.data || ctxs).map((ctx) => {
            return new ValidatedSnowplowObject(ctx);
        });
    }

    validate(schemas) {
        this.payload.validate(
            schemas[this.payload.get().schema.replace("iglu:", "")]
        );
        this.contexts.forEach((ctx) => {
            ctx.validate(schemas[ctx.get().schema.replace("iglu:", "")]);
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
