const path = require("path");
const Payload = require("./Payload");
const Context = require("./Context");
const { Template } = require("../Template");

class Event extends Payload {
    constructor(data, index) {
        super(data.payload);

        this.contexts = data.contexts.map((ctx) => new Context(ctx));

        // The caller (appLogger / displayEvents) is responsible for passing in
        // the index from the renderer-local event store. Computing it here used
        // to require a synchronous IPC call to the main process on every
        // construction.
        this.index = index;
    }

    showDetails(itemEl) {
        // Called from the delegated click handler on #events-container, so we
        // receive the <li> directly rather than a click event whose
        // currentTarget would be the container.
        const selectedEvents = document.querySelectorAll("#events-container li.selected");
        Array.from(selectedEvents).forEach((elem) => {
            elem.classList.remove("selected");
        });
        itemEl.classList.add("selected");
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

    logItemHtml() {
        // Pure: produces the HTML for this event's list item but does not
        // touch the DOM. The caller (appLogger) batches inserts to keep
        // bursty traffic from causing one layout + one filter pass per
        // event.
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

        let html;
        tmpl.render(data, (rendered) => {
            html = rendered;
        });
        return html;
    }
}

module.exports = Event;
