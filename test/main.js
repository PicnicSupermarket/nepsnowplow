"use strict";

const { Application } = require("spectron");
const electronPath = require("electron");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const path = require("path");

chai.should();
chai.use(chaiAsPromised);

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

    afterEach(function() {
        if (this.app && this.app.isRunning()) {
            return this.app.stop();
        }
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
                    logs.filter((log) => log.level === "SEVERE").length.should.equal(0);
                });
        });
    });
});
