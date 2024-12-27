const _ = require("underscore");
const redis = require("redis");

const config = bl("config");
const logger = bl("logger")(module);

// Create cache
const cache = redis.createClient(config.redis);

// Create instance
const cm = {};

// Set value
cm.set = (key, val, options) => {
    if (logger.isDebugEnabled()) logger.debug(`cache set - key: ${key}`);
    return new Promise((resolve, reject) => {
        const params = [key, JSON.stringify(val)];
        // FIXME (DoMo): unsupported by redis:3, implement once redis is upgrade
        // if (options?.get) {
        //     params.push("GET");
        // }
        if (options?.expire) {
            params.push("EX");
            params.push(options.expire);
        }

        cache.set(params, (err, val) => err ? reject(err) : resolve(options?.get ? val : undefined));
    })
}

// Get value
cm.get = key => {
    if (logger.isDebugEnabled()) logger.debug(`cache get - key: ${key}`);
    return new Promise((resolve, reject) => cache.get(key, (err, val) => err ? reject(err) : resolve(JSON.parse(val))));
}

// Delete value
cm.delete = key => {
    if (logger.isDebugEnabled()) logger.debug(`cache delete - key: ${key}`);
    return new Promise((resolve, reject) => cache.del(key, (err, val) => err ? reject(err) : resolve(val)));
}

// Query keys
cm.keys = pattern => {
    if (logger.isDebugEnabled()) logger.debug(`cache keys - pattern: ${pattern}`);
    return new Promise((resolve, reject) => cache.keys(pattern, (err, val) => err ? reject(err) : resolve(val)));
}

cm.multiGet = keys => {
    if (logger.isDebugEnabled()) logger.debug(`cache mget - keys: ${keys}`);
    return new Promise((resolve, reject) => cache.mget(keys, (err, val) => err ? reject(err) : resolve(val?.map(JSON.parse))));
}

// Delete keys
cm.deleteKeys = pattern => cm.keys(pattern).then(keys => Promise.all(_.map(keys, key => cm.delete(key))));

// Get keys
cm.getKeys = pattern => cm.keys(pattern).then(keys => keys?.length ? cm.multiGet(keys) : []);

// Cached query
cm.cached = (key, q, defaultValue = null) =>
    cm.get(key).then(value => {
        if (value) {
            return value;
        }

        return q().then(value => {
            if (value) {
                cm.set(key, value);
            }

            return value || defaultValue;
        })
    })


// Shutdown cache
cm.quit = () => cache.quit();

module.exports = cm;
