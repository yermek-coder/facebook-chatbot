require("dotenv").config();

const $m = require("./magic");

// Requires
const http = require("http");
const path = require("path");
const _ = require("underscore");
const express = require("express");
const bodyParser = require("body-parser");
const jsonPromise = require("express-json-promise");
const passport = require("passport");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const helmet = require("helmet");
const cors = require("cors");
const assert = require('assert')

const logger = bl("logger")(module);

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection %s reason: %s", promise, reason);
});
process.on("uncaughtException", err => {
    logger.error("Uncaught exception - %s", err);
    process.exit(1);
});

// Inject Businesslogic
_.each($m.scan("bl"), function (bl) {
    logger.debug(`Using Businesslogic: ${bl.id}`);
    require(bl.file);
});

// Inject Providers
const pm = bl("provider");
_.each($m.scan("bl/provider"), function (p) {
    const spec = p.id.split("/");
    assert(spec.length >= 2, "Invalid Provider Spec: " + p.id);
    const type = spec.shift();
    const id = spec.join(".");

    // Create provider
    const provider = require(p.file);
    assert(provider && _.isObject(provider), "Invalid provider");
    provider.id = provider.id || id;

    // Use provider
    logger.debug(`Using Provider: ${type}:${id}`);
    pm.use(type, provider);
})

const config = bl("config");

const app = express();
const server = http.createServer(app);

app.set("port", config.port);
app.set("views", path.join(__dirname, "views"));

// Configure Middleware
app.use(helmet({
    frameguard: false
}));

function rawBodySaver(req, res, buf, encoding) {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || "utf8");
    }
}

app.use(bodyParser.json({ verify: rawBodySaver }));
app.use(bodyParser.urlencoded({ verify: rawBodySaver, extended: true }));
app.use(bodyParser.raw({ verify: rawBodySaver, type: req => req.headers["content-type"] === undefined, limit: "100mb" }));

// Custom middleware
app.use((req, res, next) => {
    req.context = {
        query: req.query,
        params: req.params
    };
    next();
});

// Session config
const sessionConfig = {
    store: new RedisStore({
        host: config.redis.host,
        port: config.redis.port,
        pass: config.redis.password
    }),
    secret: config.security.sessionSecret,
    resave: true,
    saveUninitialized: false
};

app.use(session(sessionConfig));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Configure passport
bl("security").configure();

// Inject request context
app.use(function (req, res, next) {
    req.context = {
        user: req.user,
        query: req.query,
        params: req.params
    }

    next();
})

app.use(jsonPromise());

// Inject API Routes
const apiauth = passport.authenticate(_.compact(_.union(pm.supports("passport", "api").map(p => (p.strategy || p.id)), [config.security.jwt.enabled && "jwt", "accesstoken"])), {
    session: false
});

_.each($m.scan("api"), function (api) {
    const service = require(api.file);
    if (service) {
        logger.debug(`Using API: ${api.id}`);
        console.log(`Using API: ${api.id}`);

        // Apply API Route and access token strategy and CORS
        app.use("/api/" + api.id, cors(config.security.cors), apiauth, (req, res, done) => {
            // Inject authenticated user into context
            req.context.user = req.user;
            done();
        }, service);
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
            message: err.message
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
    server: server
};
