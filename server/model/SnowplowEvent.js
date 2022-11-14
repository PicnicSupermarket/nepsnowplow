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

    setValidationResult(badEvent, goodEvent) {
        const error =
            badEvent && badEvent.errors && badEvent.errors[1] && JSON.parse(badEvent.errors[1]);

        const messages = error?.data?.failure?.messages ?? [];
        const errorMap = messages.reduce((prev, current) => {
            switch (current.error.error) {
                case "ResolutionError":
                    return { ...prev, [current.schemaKey]: ["Unable to resolve schema"] };
                default:
                    const validationMessages = current?.error?.dataReports.map(
                        (report) => report.message
                    );
                    return { ...prev, [current.schemaKey]: validationMessages };
            }
        }, {});

        const updateSnowplowItemValidation = (item) => {
            const schema = item.obj.schema;
            if (!goodEvent && !badEvent) {
                item.updateValidation("unknown", ["Event not validated using Snowplow Micro"]);
            } else if (schema in errorMap) {
                item.updateValidation("invalid", errorMap[schema]);
            } else {
                item.updateValidation("valid", undefined);
            }
        };

        updateSnowplowItemValidation(this.payload);
        this.contexts.forEach(updateSnowplowItemValidation);
    }

    toString() {
        return JSON.stringify(this);
    }

    getSchemaName() {
        return this.payload.getSchemaName();
    }
}

module.exports = SnowplowEvent;
