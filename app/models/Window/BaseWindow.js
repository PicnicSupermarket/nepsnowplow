const BrowserWindow = require("electron").BrowserWindow || require("electron").remote.BrowserWindow;
const Menu = require("electron").Menu || require("electron").remote.Menu;
const os = require("os");

class BaseWindow {
    constructor(path, options) {
        // Create the browser window.
        let defaults = {
            acceptFirstMouse: true,
            show: false,
            title: "NepSnowplow",
            titleBarStyle: "hidden",
            frame: os.platform() !== "win32"
        };

        this.win = new BrowserWindow(Object.assign(defaults, options));
        this.win.loadFile(path);

        this.win.once("ready-to-show", () => {
            this.win.show();
        });

        let template = [
            {
                label: "NepSnowplow",
                submenu: [
                    {
                        label: "Quit",
                        role: "quit"
                    }
                ]
            },
            {
                label: "Debug",
                submenu: [
                    {
                        label: "Open debug panel",
                        role: "toggleDevTools"
                    },
                    {
                        label: "Reload",
                        role: "reload"
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    on(event, callback) {
        this.win.on(event, callback);
    }

    once(event, callback) {
        this.win.once(event, callback);
    }
}

module.exports = BaseWindow;
