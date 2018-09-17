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

describe("NepSnowplow", function() {
    this.timeout(10000);
    this.slow(200);

    beforeEach(function() {
        this.snowplowObject = {
            data: [
                {
                    uid: "userid",
                    ue_px: base64.encode(
                        '{"schema": "iglu:snowplow/event_schema/jsonschema/1-0-0"}'
                    ),
                    cx: base64.encode(
                        '[{"schema": "iglu:snowplow/context_schema/jsonschema/1-0-0"}]'
                    )
                }
            ]
        };
        this.server = chai.request("http://localhost:3000");
        this.app = new Application({
            // use electron from our node_modules
            path: electron,

            // The following line tells spectron to start electron
            // from the parent folder.
            args: [path.join(__dirname, "..")]
        });
        return this.app.start();
    });

    beforeEach(function() {
        chaiAsPromised.transferPromiseness = this.app.transferPromiseness;
    });

    describe("application", function() {
        it("shows an initial window", function() {
            // prettier-ignore
            return this.app.client
                .browserWindow.isMinimized().should.eventually.be.false
                .browserWindow.isVisible().should.eventually.be.true;
        });

        it("starts without errors", function() {
            return this.app.client
                .waitUntilWindowLoaded()
                .getRenderProcessLogs()
                .then(function(logs) {
                    logs.filter((log) => log.level === "SEVERE").should.have.lengthOf(0);
                });
        });

        it("logs Snowplow event", function() {
            let client = this.app.client;
            return this.server
                .post("/")
                .send(this.snowplowObject)
                .then(async function() {
                    await client.waitForExist("#event-0").should.eventually.be.true;
                });
        });
    });

    describe("server", function() {
        it("is running", function() {
            return this.server
                .post("/")
                .send("")
                .then(function(response) {
                    response.should.not.have.status(404);
                });
        });

        it("rejects non-Snowplow data", function() {
            return this.server
                .post("/")
                .send("")
                .then(function(response) {
                    response.should.not.have.status(204);
                });
        });

        it("accepts Snowplow event", function() {
            return this.server
                .post("/")
                .send(this.snowplowObject)
                .then(function(response) {
                    response.should.have.status(204);
                });
        });

        it("stores Snowplow event", function() {
            let remote = this.app.electron.remote;
            return this.server
                .post("/")
                .send(this.snowplowObject)
                .then(async function() {
                    await remote.getGlobal("trackedEvents").should.eventually.have.lengthOf(1);
                });
        });
    });

    afterEach(function() {
        if (this.app && this.app.isRunning()) {
            return this.app.stop();
        }
    });
});
