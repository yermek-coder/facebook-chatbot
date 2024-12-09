const assert = require("assert");
const util = require("util");

const _ = require("underscore");
const { createLogger, format, transports } = require("winston");
const { AxiosError } = require("axios");

const config = JSON.parse(process.env.LOG_CONFIG || "{}");

const extractName = (module) => {
    return module.filename
        .replace(__basedir + "/", "")
        .replaceAll("/", ":")
        .split(".")
        .slice(0, -1)
        .join(".");
};

const getConfig = (base, name) => {
    const parts = name.split(":");
    let config = base[parts.shift()];
    if (config && name.includes(":")) {
        return getConfig(config, parts.join(":")) || config;
    }
    return config;
};

const formatError = (error) => {
    try {
        if (error instanceof AxiosError) {
            const message = error.toJSON();
            if (_.isObject(message?.config?.headers)) {
                // Redact header
                message.config.headers = Object.keys(message.config.headers);
            }
            if (error.response) {
                // AxiosError with response => request was made but status code indicates failure
                if (["arraybuffer", "document", "stream"].includes(error.response.config?.responseType)) {
                    message.response = { data: error.response.config.responseType };
                } else {
                    message.response = message.response || _.pick(error.response, "data");
                }
            }
            return JSON.stringify(message, null, 2);
        } else if (error instanceof assert.AssertionError) {
            // AssertionError does not print stack trace...
            return util.inspect(error);
        } else if (_.isFunction(error?.toJSON)) {
            return JSON.stringify(error.toJSON(), null, 2);
        }
    } catch (e) {
        // Ignore formatting errors (e.g. circular reference) and return original error object
    }
    return error;
};

module.exports = (identifier) => {
    assert(identifier, "Identifier is required");

    const name = _.isString(identifier) ? identifier : extractName(identifier);
    const loggerConfig = getConfig(config, name) || {};

    const logger = createLogger({
        level: loggerConfig.level || process.env.LOG_LEVEL || "info",
        silent: loggerConfig.silent || false,
        defaultMeta: { logger: { service: "meta-chatbot", name } },
    });

    if (process.env.NODE_ENV !== "production") {
        logger.add(
            new transports.Console({
                format: format.combine(format.timestamp(), format.splat(), format.colorize(), format.simple()),
            })
        );
    } else {
        logger.add(
            new transports.Console({
                format: format.combine(format.timestamp({ alias: "@timestamp" }), format.splat(), format.json()),
            })
        );
    }

    // Replace error log function to format error objects before logging them
    const errorLogFn = logger.error;
    logger.error = (...args) => {
        args = args.map((arg) => (arg instanceof Error ? formatError(arg) : arg));
        errorLogFn(...args);
    };

    return logger;
};
