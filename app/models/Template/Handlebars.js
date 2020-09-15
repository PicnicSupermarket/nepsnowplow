var Handlebars = require("handlebars");

Handlebars.registerHelper("if", function (conditional, options) {
    if (
        options.hash.eq === conditional ||
        (typeof options.hash.eq === "undefined" && conditional)
    ) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

module.exports = Handlebars;
