const remote = require("@electron/remote");
const path = require("path");
const filter = require("../../../server/filter");
const Payload = require("./Payload");
const Context = require("./Context");
const { Template } = require("../Template");

class Event extends Payload {
    constructor(data, index) {
        super(data.payload);

        this.contexts = data.contexts.map((ctx) => new Context(ctx));

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
        const tmpl = new Template(path.join(__dirname, "EventDetails.hbs"));
        const data = {
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
            const container = document.getElementById("details-container");
            container.parentNode.scrollTo(0, 0);
            container.innerHTML = html;
            document.getElementById("event-details").appendChild(this.getJson());

            const contexts = document.querySelectorAll("#event-contexts .event-context");
            this.contexts.forEach((ctx, idx) => {
                contexts[idx].appendChild(ctx.getJson());
            });
        });
    }

    logItem() {
        const tmpl = new Template(path.join(__dirname, "EventLogItem.hbs"));
        const data = {
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
            const container = document.getElementById("events-container");
            const item = document.createElement("li");
            container.appendChild(item);
            item.outerHTML = html;

            document
                .getElementById(`event-${this.index}`)
                .addEventListener("click", this.showDetails.bind(this));

            // event items are hidden by default
            // if filter is set and events match the filter,
            // below will unhide the generated element
            filter.update();
        });
    }
}

module.exports = Event;
