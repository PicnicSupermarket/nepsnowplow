"use strict";

const { Application } = require("spectron");
const electronPath = require("electron");
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

    beforeEach(function() {
        this.app = new Application({
            // use electron from our node_modules
            path: electronPath,

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
                .then((logs) => {
                    logs.filter((log) => log.level === "SEVERE").should.have.lengthOf(0);
                });
        });
    });

    describe("server", function() {
        before(function() {
            this.server = chai.request("http://localhost:3000");
        });

        it("is running", function() {
            return this.server
                .post("/")
                .send("")
                .then((response) => {
                    response.should.not.have.status(404);
                });
        });

        it("rejects non-Snowplow data", function() {
            return this.server
                .post("/")
                .send("")
                .then((response) => {
                    response.should.not.have.status(204);
                });
        });

        it("accepts Snowplow event", function() {
            let snowplowObject = {
                data: [
                    {
                        uid: "userid",
                        ue_px: base64.encode('{"schema": "iglu:snowplow.sample_schema"}'),
                        cx: base64.encode('[{"schema": "iglu:snowplow.sample_schema2"}]')
                    }
                ]
            };
            return this.server
                .post("/")
                .send(snowplowObject)
                .then((response) => {
                    response.should.have.status(204);
                });
        });
    });

    afterEach(function() {
        if (this.app && this.app.isRunning()) {
            return this.app.stop();
        }
    });
});
