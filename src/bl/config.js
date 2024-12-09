const path = require("path");
const _ = require("underscore");
const $magic = include("magic");

const logger = bl("logger")(module);

const configs = _.union(_.pluck($magic.scan("config"), "file"), _.pluck($magic.scan("../../config"), "file"));

const config = {};
_.each(configs, (file) => {
    const info = path.parse(file);
    logger.debug(`Init config: ${info.name}`);
    const c = require(file);
    if (c && _.isFunction(c.build)) {
        c.build(config);
    } else if (c) {
        _.extend(config, c);
    }
});

module.exports = config;
