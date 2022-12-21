const fs = require("fs");
const path = require("path");
const Handlebars = require("./Handlebars");

const compiledTemplates = {};

class Template {
    constructor(options) {
        if (typeof options === "object") {
            this.path = path.resolve(options.path);
            this.parent = options.parent;
        } else if (typeof options === "string") {
            this.path = path.resolve(options);
        }
    }

    render(data, callback) {
        let template;
        // only read Handlebars templates once
        if (this.path in compiledTemplates) {
            template = compiledTemplates[this.path];
        } else {
            const tmpl = fs.readFileSync(this.path, "utf-8");
            template = Handlebars.compile(tmpl.toString());
        }
        this.readFileCallback(template, data, callback);
    }

    readFileCallback(compiledTemplate, data, callback) {
        compiledTemplates[this.path] = compiledTemplate;

        const html = compiledTemplate(data);
        if (typeof this.parent !== "undefined") {
            const item = document.createElement("item");
            this.parent.appendChild(item);
            item.outerHTML = html;
        }

        if (typeof callback === "function") {
            callback(html);
        }
    }
}

module.exports = Template;
