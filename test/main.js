"use strict";

const { _electron: electron } = require("playwright");
const { test, expect } = require("@playwright/test");

const path = require("path");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const chaiHttp = require("chai-http");

const base64 = require("../server/base64");

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiHttp);

var app;
var server;
var listeningPort;

const validSnowplowObject = {
    data: [
        {
            uid: "userid",
            ue_px: base64.encode('{"schema": "iglu:snowplow/event_schema/jsonschema/1-0-0"}'),
            cx: base64.encode('[{"schema": "iglu:snowplow/context_schema/jsonschema/1-0-0"}]'),
        },
    ],
};

test.beforeAll(async () => {
    listeningPort = 3000;
    server = chai.request(`http://localhost:${listeningPort}`);

    app = await electron.launch({ args: [path.join(__dirname, "..", "app.js")] });
    await delay(1000);
});

test.describe("server", function () {
    test("is running", async () => {
        return server
            .post("/")
            .send("")
            .then(function (response) {
                response.should.not.have.status(404);
            });
    });
    test("rejects non-Snowplow data", async () => {
        return server
            .post("/")
            .send("")
            .then(function (response) {
                response.should.not.have.status(204);
            });
    });
    test("accepts Snowplow event", async () => {
        return server
            .post("/")
            .send(validSnowplowObject)
            .then(function (response) {
                response.should.have.status(204);
            });
    });
});

test.describe("application", function () {
    test("logs Snowplow event", async () => {
        await server.post("/").send(validSnowplowObject);
        const window = await app.firstWindow();
        const eventElement = window.locator("#event-0");
        await expect(eventElement).toHaveCount(1);
    });
});

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}
