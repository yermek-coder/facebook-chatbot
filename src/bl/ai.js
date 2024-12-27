const _ = require("underscore");
const pm = bl("provider");

class AiManager {
    execute(model, payload) {
        const provider = _.first(pm.supports("ai", model));
        if (provider) {
            return provider.execute(payload);
        }

        throw new Error("No provider found");
    }
}

module.exports = new AiManager();
