var chalk = require("chalk");
var prettyjson = require("prettyjson");
var sortObject = require("../sort_object.js");

function logEvent(event) {
    console.log(
        "================================================================================"
    );
    console.log("==  User id : %s", event.userId);
    console.log(
        "==  ------------------------------------------------------------------------  =="
    );
    console.log(
        "==  Event : %s - Version: %s %s",
        getSchemaName(event.payload.get()),
        getSchemaVersion(event.payload.get()),
        getSchemaValidity(event.payload.isValid)
    );
    if (!event.payload.isValid) {
        console.error(chalk.bgRed("Errors: %s"), event.payload.errors);
    }

    console.log(prettyjson.render(sortObject(event.payload.get())));
    console.log(
        "==  ------------------------------------------------------------------------  =="
    );
    console.log("==  Attached contexts :");
    event.contexts.forEach(function(ctx) {
        sortObject(ctx);
    });
    event.contexts.forEach(function(ctx) {
        console.log(
            chalk.bgBlack("Context : %s - Version: %s %s"),
            getSchemaName(ctx.get()),
            getSchemaVersion(ctx.get()),
            getSchemaValidity(ctx.isValid)
        );
        if (!ctx.isValid) {
            console.error(chalk.bgRed("Errors: %s"), ctx.errors);
        }
        console.log(prettyjson.render(sortObject(ctx.get())));
        console.log("");
    });
    console.log(
        "================================================================================\n\n"
    );
}

function getSchemaValidity(bool) {
    if (bool === undefined) {
        return "";
    } else if (bool === true) {
        return chalk.green.bold("✔");
    } else if (bool === false) {
        return chalk.red.bold("✘");
    }
}

function getSchemaName(schemaHolder) {
    return schemaHolder.schema.split("/")[1];
}

function getSchemaVersion(schemaHolder) {
    return schemaHolder.schema.split("/")[3];
}

module.exports = logEvent;
