const fs = require("fs");
const path = require("path");
const Handlebars = require("./Handlebars");

const compiledTemplates = {};

function compileAndCache(absPath) {
    const source = fs.readFileSync(absPath, "utf-8");
    const compiled = Handlebars.compile(source.toString());
    compiledTemplates[absPath] = compiled;
    return compiled;
}

function collectHbsFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return acc.concat(collectHbsFiles(full));
        }
        if (entry.isFile() && entry.name.endsWith(".hbs")) {
            acc.push(full);
        }
        return acc;
    }, []);
}

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
        const template = compiledTemplates[this.path] || compileAndCache(this.path);

        const html = template(data);
        if (typeof this.parent !== "undefined") {
            const item = document.createElement("item");
            this.parent.appendChild(item);
            item.outerHTML = html;
        }

        if (typeof callback === "function") {
            callback(html);
        }
    }

    // Pre-compile and cache the given .hbs files so the first render() call
    // doesn't pay synchronous disk I/O on the renderer thread. Paths are
    // resolved to absolute form to match the cache key used by render().
    static precompile(paths) {
        paths.forEach((p) => {
            const absPath = path.resolve(p);
            if (!(absPath in compiledTemplates)) {
                compileAndCache(absPath);
            }
        });
    }

    // Recursively walk `dir` for every .hbs file and pre-compile each one.
    static precompileDir(dir) {
        Template.precompile(collectHbsFiles(path.resolve(dir)));
    }
}

module.exports = Template;
