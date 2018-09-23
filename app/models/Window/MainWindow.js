const path = require("path");

const BaseWindow = require("./BaseWindow");

class MainWindow extends BaseWindow {
    constructor() {
        let options = {
            width: 1024,
            height: 768
        };
        super(path.join(__dirname, "..", "..", "index.html"), options);
    }
}

module.exports = MainWindow;
