const _ = require("underscore");
const events = require("events");

const logger = bl("logger")(module);

class PromiseEventEmitter extends events.EventEmitter {
    emitp(event, type) {
        if (logger.isDebugEnabled()) logger.debug(`+ ${event}:${type}`);
        const q = [];
        const args = _.rest(arguments);
        _.each(this.listeners(event), listener => q.push(() => Promise.resolve(listener.apply(listener, args))));
        return Promise.seq(q).then(result => {
            if (logger.isDebugEnabled()) logger.debug(`- ${event}:${type}`);
            return result;
        })
    }
}

module.exports = new PromiseEventEmitter();
