const path = require("path");

const { remote } = require("electron");
const BaseWindow = require("./BaseWindow");
// const Store = global.options || remote.getGlobal("options");

class OptionWindow extends BaseWindow {
    constructor() {
        let options = {
            width: 600,
            height: 400
        };
        super(path.join(__dirname, "..", "..", "settings.html"), options);
    }
}

module.exports = OptionWindow;
