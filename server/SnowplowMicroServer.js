const os = require("os");
const axios = require("axios");
const path = require("path");
const { spawn } = require("child_process");

class SnowplowMicroServer {
    constructor(appPath) {
        this.appPath = appPath;
    }

    start() {
        const appPath = this.appPath.replace("app.asar", "");
        const jarPath = path.join(appPath, "jars", "snowplow-micro-1.3.4.jar");
        const jrePath = path.join(appPath, `jre/${os.platform()}_${os.arch()}/bin/java`);
        const microConfPath = path.join(appPath, "snowplow_micro_config", "micro.conf");
        const igluPath = path.join(appPath, "snowplow_micro_config", "iglu.json");
        const command = spawn(jrePath, [
            "-jar",
            jarPath,
            "--collector-config",
            microConfPath,
            "--iglu",
            igluPath,
        ]);

        // Figure out on which port Snowplow Micro is running
        command.stderr.on("data", (data) => {
            const match = data.toString()?.match(/.*:(\d*).?/i);
            if (match && match[1]) {
                console.log(`Snowplow Micro is running on port: ${match[1]}`);
                this.port = match[1] ?? this.port;
            }
        });
    }

    validateEvent(event) {
        return axios({
            method: "post",
            url: `http://localhost:${this.port}/com.snowplowanalytics.snowplow/tp2`,
            data: event,
        });
    }

    retrieveBadEvents() {
        return axios({
            method: "get",
            url: `http://localhost:${this.port}/micro/bad`,
        });
    }

    retrieveGoodEvents() {
        return axios({
            method: "get",
            url: `http://localhost:${this.port}/micro/good`,
        });
    }

    resetEvents() {
        return axios({
            method: "get",
            url: `http://localhost:${this.port}/micro/reset`,
        });
    }
}

module.exports = SnowplowMicroServer;
