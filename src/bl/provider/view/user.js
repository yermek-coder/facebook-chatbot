const _ = require("underscore");

// const VALID_PROPS = ["external_id"];

module.exports = {
    supports: () => true,
    apply: async (req, result) => {
        const user = _.pick(req.user, "id", "uid", "email", "forename", "surname", "groups", "locale", "timezone", "profile", "attachments");
        // user.properties = _.reduce(
        //     req.user && req.user.properties,
        //     (next, val, key) => {
        //         if (key && (key.indexOf("ui_") === 0 || VALID_PROPS.includes(key))) {
        //             next[key] = val;
        //         }

        //         return next;
        //     },
        //     {}
        // );

        result.user = user;
        result.locale = (result.params && result.params.lang) || (req.user && req.user.locale);
    }
};
