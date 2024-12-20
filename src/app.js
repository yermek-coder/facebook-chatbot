require("dotenv").config();

const $m = require("./magic");

// Requires
const http = require("http");
const path = require("path");
const _ = require("underscore");
const express = require("express");
const bodyParser = require("body-parser");
const jsonPromise = require("express-json-promise");

const logger = bl("logger")(module);

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection %s reason: %s", promise, reason);
});
process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception - %s", err);
    process.exit(1);
});

// Inject Businesslogic
_.each($m.scan("bl"), function (bl) {
    logger.debug(`Using Businesslogic: ${bl.id}`);
    require(bl.file);
});

const config = bl("config");

const app = express();
const server = http.createServer(app);

app.set("port", config.port);
app.set("views", path.join(__dirname, "views"));

function rawBodySaver(req, res, buf, encoding) {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || "utf8");
    }
}

app.use(
    bodyParser.json({
        verify: rawBodySaver,
    })
);
app.use(
    bodyParser.urlencoded({
        verify: rawBodySaver,
        extended: true,
    })
);
app.use(
    bodyParser.raw({
        verify: rawBodySaver,
        type: (req) => req.headers["content-type"] === undefined,
        limit: "100mb",
    })
);

// Custom middleware
app.use((req, res, next) => {
    req.context = {
        query: req.query,
        params: req.params,
    };
    next();
});

app.use(jsonPromise());

_.each($m.scan("api"), function (api) {
    const service = require(api.file);
    if (service) {
        logger.debug(`Using API: ${api.id}`);
    }
});

// Inject Web Routes
_.each($m.scan("routes"), function (route) {
    const router = require(route.file);
    if (router) {
        logger.debug(`Using Route: ${route.id}`);
        app.use("/", router);
    }
});

// Error Handling (404 if no other route matches)
app.use(function (req, res, next) {
    const err = new Error("Not Found");
    err.status = 404;
    err.ref = `${req.method?.toUpperCase()} ${req.url}`;
    next(err);
});

// Error Handler (requires 4 arguments)
// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
    logger.error("Default error handler triggered - %s", err);
    res.status(err.status || 500);
    if (req.path.startsWith("/api") || (req.headers["content-type"] || "").startsWith("application/json")) {
        res.json({
            message: err.message,
        });
    } else {
        res.send(err);
    }
});

// Start server
server.listen(app.get("port"), function () {
    logger.debug(`Express server listening on port ${server.address().port}`);
});

module.exports = {
    app: app,
    server: server,
};
