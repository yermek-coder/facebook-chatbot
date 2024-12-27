// Magic
const _ = require("underscore");
const assert = require("assert");

// Helper
function sort(providers) {
    return _.sortBy(providers, "order");
}

// Init Metadata Manager
const pm = {
    providers: {}
};

pm.use = (type, provider) => {
    assert(type, "No type specified");
    assert(provider, "No provider specified");
    pm.providers[type] = pm.providers[type] || [];
    pm.providers[type].push(provider);
}

pm.get = type => pm.providers[type] || []

pm.id = (type, id) => _.findWhere(pm.providers[type], { id: id })

pm.find = (type, fn) => sort(_.find(pm.providers[type], fn))

pm.filter = (type, fn) => sort(_.filter(pm.providers[type], fn))

pm.where = (type, props) => sort(_.where(pm.providers[type], props))

pm.supports = (type, test) => sort(pm.filter(type, p => {
    if (_.isArray(p.supports)) {
        return _.contains(p.supports, test);
    } else if (_.isFunction(p.supports)) {
        return p.supports(test);
    } else if (_.isObject(p.supports)) {
        return _.isMatch(test, p.supports);
    }

    return test == p.supports;
}))

pm.exec = (type, test, fn, args) => {
    const result = [];
    _.each(pm.supports(type, test), provider => {
        if (provider && _.isFunction(provider[fn])) {
            result.push(provider[fn].apply(null, args));
        }
    })

    return result;
}

pm.resolve = (type, test, fn, args) => Promise.all(pm.exec(type, test, fn, args))

pm.seq = (type, test, fn, args) => {
    const q = [];
    _.each(pm.supports(type, test), provider => {
        if (provider && _.isFunction(provider[fn])) {
            q.push(() => provider[fn].apply(null, args));
        }
    })

    return Promise.seq(q);
}

pm.first = (type, test, fn, args) => {
    const provider = _.first(pm.supports(type, test));
    assert(provider, `No provider found (type ${type}, test ${test})`);

    return provider[fn].apply(null, args);
};

module.exports = pm;
