const Handlebars = require("handlebars");

Handlebars.registerHelper("if", (conditional, options) => {
    if (
        options.hash.eq === conditional ||
        (typeof options.hash.eq === "undefined" && conditional)
    ) {
        return options.fn(this);
    }
    return options.inverse(this);
});

module.exports = Handlebars;
