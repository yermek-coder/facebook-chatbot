const logger = bl("logger")(module);

// Execute promises sequential
// @param list A list of factory functions, each returning a Promise
Promise.seq = function(factories) {
    return factories.reduce((prev, fn) => {
        if (!(prev instanceof Promise)) {
            logger.error("INVALID PROMISE %s", prev);
        }

        return prev.then(fn);
    }, Promise.resolve());
}
