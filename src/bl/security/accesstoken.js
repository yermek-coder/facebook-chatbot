var util = require("util");
var _ = require("underscore");
var assert = require("assert");
var passport = require("passport-strategy");
var config = bl("config");

// Constructor
function Strategy(options, verify) {
    // Init
    if (_.isFunction(options)) {
        verify = options;
        options = {};
    }

    // Asserts
    assert(verify, "Strategy requires a verify callback");

    // Super
    passport.Strategy.call(this);

    // Init name
    this.name = "accesstoken";

    // Init attributes
    this._verify = verify;
    this._passReqToCallback = options.passReqToCallback;
    this._tokenField = options.tokenField || config.security.accesstoken.header;
}

// Inheritance
util.inherits(Strategy, passport.Strategy);

// Overwrite 'authenticate' function
Strategy.prototype.authenticate = function(req) {
    // Init
    var that = this;

    // Query token
    var token = req.headers[that._tokenField];

    // Create callback
    function verified(err, user, info) {
        if (err) {
            that.error(err);
        } else if (user) {
            that.success(user, info);
        } else {
            that.pass();
        }
    }

    // Execute verification
    try {
        if (!token) {
            that.pass();
        } else if (that._passReqToCallback) {
            that._verify(req, token, verified);
        } else {
            that._verify(token, verified);
        }
    } catch (e) {
        return that.error(e);
    }
}

module.exports = {
    Strategy: Strategy
}
