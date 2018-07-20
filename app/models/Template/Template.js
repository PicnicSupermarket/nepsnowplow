"use strict";
const fs = require("fs");
const path = require("path");
const Handlebars = require("./Handlebars");

var compiledTemplates = {};

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
        let tmpl;
        // only read Handlebars templates once
        if (this.path in compiledTemplates) {
            let tmpl = compiledTemplates[this.path];
            this.readFileCallback(tmpl, data, callback);
        } else {
            let tmpl = fs.readFileSync(this.path, "utf-8");
            let template = Handlebars.compile(tmpl.toString());
            this.readFileCallback(template, data, callback);
        }
    }

    readFileCallback(compiledTemplate, data, callback) {
        compiledTemplates[this.path] = compiledTemplate;

        let html = compiledTemplate(data);
        if (typeof this.parent !== "undefined") {
            let item = document.createElement("item");
            this.parent.appendChild(item);
            item.outerHTML = html;
        }

        if (typeof callback === "function") callback(html);
    }
}

module.exports = Template;
