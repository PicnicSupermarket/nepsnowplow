var argumentParser = require("argparse");

var parser = new argumentParser.ArgumentParser({
    version: "0.0.1",
    addHelp: true
});

parser.addArgument(["-p", "--port"], {
    help: "The port on which to run the server",
    type: "int",
    defaultValue: 3000
});

parser.addArgument(["-f", "--filter"], {
    help: "A filter on the event type",
    type: "string",
    defaultValue: ""
});

parser.addArgument(["-s", "--schemas"], {
    help: "A schemas directory to validate snowplow events",
    type: "string",
    defaultValue: ""
});

var arguments = parser.parseArgs();
module.exports = arguments;
