"use strict";

const { Application } = require("spectron");
const electron = require("electron");
const path = require("path");

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const chaiHttp = require("chai-http");

const base64 = require("../server/base64");

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiHttp);

function createApplication() {
    return new Application({
        // use electron from our node_modules
        path: electron,

        // The following line tells spectron to start electron
        // from the parent folder.
        args: [path.join(__dirname, "..")],
    });
}

describe("NepSnowplow", function () {
    this.timeout(10000);
    this.slow(200);

    beforeEach(function () {
        this.snowplowObject = {
            data: [
                {
                    uid: "userid",
                    ue_px: base64.encode(
                        '{"schema": "iglu:snowplow/event_schema/jsonschema/1-0-0"}'
                    ),
                    cx: base64.encode(
                        '[{"schema": "iglu:snowplow/context_schema/jsonschema/1-0-0"}]'
                    ),
                },
            ],
        };
        this.listeningPort = 3000; // TODO: refactor such that we read from the default app options
        this.server = chai.request(`http://localhost:${this.listeningPort}`);
        this.app = createApplication();
        return this.app.start();
    });

    beforeEach(function () {
        chaiAsPromised.transferPromiseness = this.app.transferPromiseness;
    });

    describe("server", function () {
        it("is running", function () {
            return this.server
                .post("/")
                .send("")
                .then(function (response) {
                    response.should.not.have.status(404);
                });
        });

        it("rejects non-Snowplow data", function () {
            return this.server
                .post("/")
                .send("")
                .then(function (response) {
                    response.should.not.have.status(204);
                });
        });

        it("accepts Snowplow event", function () {
            return this.server
                .post("/")
                .send(this.snowplowObject)
                .then(function (response) {
                    response.should.have.status(204);
                });
        });

        it("stores Snowplow event", function () {
            let remote = this.app.electron.remote;
            return this.server
                .post("/")
                .send(this.snowplowObject)
                .then(async function () {
                    await remote.getGlobal("trackedEvents").should.eventually.have.lengthOf(1);
                });
        });
    });

    describe("application", function () {
        it("shows an initial window", async function () {
            // prettier-ignore
            await this.app.client
                .browserWindow.isMinimized().should.eventually.be.false;
            return this.app.client.browserWindow.isVisible().should.eventually.be.true;
        });

        it("uses the default port", function () {
            let remote = this.app.electron.remote;
            let defaultPort = this.listeningPort;
            return this.app.client.waitUntilWindowLoaded().then(function () {
                return remote
                    .getGlobal("options")
                    .should.eventually.have.property("listeningPort")
                    .that.is.equal(defaultPort);
            });
        });

        it("starts without errors", function () {
            return this.app.client.waitUntilWindowLoaded().then(() => {
                this.app.client.getRenderProcessLogs().then(function (logs) {
                    logs.filter((log) => log.level === "SEVERE").should.have.lengthOf(0);
                });
            });
        });

        describe.skip("second instance", function () {
            // double the timeout as we're launching a second app
            this.timeout(20000);

            beforeEach(function () {
                this.secondApp = createApplication();
                return this.secondApp.start();
            });

            it("uses a different port", function () {
                let secondRemote = this.secondApp.electron.remote;
                let defaultPort = this.listeningPort;
                return this.secondApp.client.waitUntilWindowLoaded().then(function () {
                    return secondRemote
                        .getGlobal("options")
                        .should.eventually.have.property("listeningPort")
                        .that.is.not.equal(defaultPort);
                });
            });

            it("starts without errors", function () {
                return this.secondApp.client.waitUntilWindowLoaded().then(() =>
                    this.secondApp.client.getRenderProcessLogs().then(function (logs) {
                        logs.filter((log) => log.level === "SEVERE").should.have.lengthOf(0);
                    })
                );
            });

            afterEach(function () {
                if (this.secondApp && this.secondApp.isRunning()) {
                    return this.secondApp.stop();
                }
            });
        });

        it("logs Snowplow event", function () {
            let client = this.app.client;
            return this.server
                .post("/")
                .send(this.snowplowObject)
                .then(async function () {
                    await client
                        .$("#event-0")
                        .then((elem) => elem.waitForExist().should.eventually.be.true);
                });
        });
    });

    afterEach(function () {
        if (this.app && this.app.isRunning()) {
            return this.app.stop();
        }
    });
});
