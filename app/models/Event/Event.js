"use strict";
const remote = require("@electron/remote");
const filter = require("../../../server/filter");
const Payload = require("./Payload");
const Context = require("./Context");
const { Template } = require("../Template");
const path = require("path");

class Event extends Payload {
    constructor(data, index) {
        super(data.payload);

        this.contexts = data.contexts.map((ctx) => {
            return new Context(ctx);
        });

        this.index = index;
        if (typeof index === "undefined") {
            this.index = remote.getGlobal("trackedEvents").length - 1;
        }
    }

    showDetails(event) {
        const selectedEvents = document.querySelectorAll("#events-container li.selected");
        Array.from(selectedEvents).forEach((elem) => {
            elem.classList.remove("selected");
        });
        event.currentTarget.classList.add("selected");
        this.renderDetails();
    }

    renderDetails() {
        let tmpl = new Template(path.join(__dirname, "EventDetails.hbs"));
        let data = {
            schemaName: this.getSchemaName(),
            validationStatus: this.getValidationStatus(),
            errors: this.errors,
            contexts: this.contexts.map((ctx) => ({
                schemaName: ctx.getSchemaName(),
                validationStatus: ctx.getValidationStatus(),
                errors: ctx.errors,
            })),
        };

        tmpl.render(data, (html) => {
            let container = document.getElementById("details-container");
            container.parentNode.scrollTo(0, 0);
            container.innerHTML = html;
            document.getElementById("event-details").appendChild(this.getJson());

            let contexts = document.querySelectorAll("#event-contexts .event-context");
            this.contexts.forEach((ctx, idx) => {
                contexts[idx].appendChild(ctx.getJson());
            });
        });
    }

    logItem() {
        let tmpl = new Template(path.join(__dirname, "EventLogItem.hbs"));
        let data = {
            index: this.index,
            schemaName: this.getSchemaName(),
            schemaVersion: this.getSchemaVersion(),
            validationStatus: this.getValidationStatus(),
            contexts: this.contexts.map((ctx) => ({
                schemaName: ctx.getSchemaName(),
                schemaVersion: ctx.getSchemaVersion(),
                validationStatus: ctx.getValidationStatus(),
            })),
        };

        tmpl.render(data, (html) => {
            let container = document.getElementById("events-container");
            let item = document.createElement("li");
            container.appendChild(item);
            item.outerHTML = html;

            document
                .getElementById("event-" + this.index)
                .addEventListener("click", this.showDetails.bind(this));

            // event items are hidden by default
            // if filter is set and events match the filter,
            // below will unhide the generated element
            filter.update();
        });
    }
}

module.exports = Event;
