const assert = require("assert");
const crypto = require("crypto");

const _ = require("underscore");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { log } = require("winston");
const JsonStrategy = require("passport-json").Strategy;
const CustomStrategy = require("passport-custom").Strategy;

// const acl = bl("acl");
// const rm = bl("role");
const um = bl("user");
// const gm = bl("group");
const cm = bl("cache");
// const ws = bl("ws");
const config = bl("config");
// const external = bl("security/external");
const AccessTokenStrategy = bl("security/accesstoken").Strategy;
const logger = bl("logger")(module);

// Helper
function check(value, res, done) {
    if (value) {
        done();
    } else {
        res.status(403).send("Forbidden");
    }
}

class SecurityManager {
    // Generate access token for given request
    login(req) {
        if (req.body.email && req.body.password) {
            return um.validate(req.body.email, req.body.password).then(user => {
                assert(user, "User not found");
                return this.generateAccessToken(user.id).then(accessToken => {
                    return {
                        accessToken: accessToken
                    };
                });
            });
        }

        throw "invalid parameters";
    }

    async jwtLogin(req) {
        let user = req.user;
        if (req.body.sharedKey) {
            user = await cm.get("sharedkey:" + req.body.sharedKey);
        } else if (req.body.email && req.body.password) {
            user = await um.validate(req.body.email, req.body.password);
        }
        assert(user, "User not found");

        // Generate session id and save it to cache
        const sessionId = crypto.randomUUID();
        cm.set("sess:" + sessionId, {
            id: user.id
        }, {
            expire: config.security.jwt.ttl
        });

        const jwtPayload = {
            id: user.id,
            sessionId,
            totpRequired: !!user.properties?.totp_enabled,
            totpValidated: false
        };
        return {
            token: this.generateJwtToken(jwtPayload),
            // wstoken: ws.token(user.id),
            totpRequired: !!user.properties?.totp_enabled
        }
    }

    // Revoke access token
    logout(req) {
        return this.revokeAccessToken(req.headers[config.security.accesstoken.header]);
    }

    generateAccessToken(id) {
        const accessToken = crypto.randomUUID();
        return cm
            .set("accesstoken:" + accessToken, id, {
                expire: config.security.accesstoken.expire
            })
            .then(() => accessToken);
    }

    // Generate new jwt token
    generateJwtToken(payload, expiresIn = null) {
        assert(payload?.id, "Invalid JWT payload");
        payload.sessionId = payload.sessionId || "";

        return jwt.sign(payload, config.security.jwt.secret, {
            expiresIn: expiresIn || config.security.jwt.expireIn
        })
    }

    // Remove access token from cache
    revokeAccessToken(accessToken) {
        assert(accessToken, "Invalid access token");
        return cm.delete("accesstoken:" + accessToken);
    }

    configure() {
        // Passport: JSON Login
        passport.use("json", new JsonStrategy({
            passReqToCallback: true,
            usernameProp: "email",
            passwordProp: "password"
        }, async (req, email, password, done) => {
            try {
                const user = await um.validate(email, password);
                assert(user, "Invalid password");

                await um.login(user.id, { timezone: req.body?.timezone });

                done(null, user);
            } catch (e) {
                done();
            }
        }))

        passport.use("jwt", new JwtStrategy({
            passReqToCallback: true,
            secretOrKey: config.security.jwt.secret,
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req) => {
                    const keys = [config.security.jwt.header, process.env.JWT_HEADER_ALTERNATIVE].filter(Boolean);
                    return keys.reduce((result, key) => result || req.headers[key] || req.query[key], null);
                }])
        }, async (req, payload, done) => {
            // Query session from cache and validate
            if (config.security.jwt.validateSession) {
                const session = await cm.get("sess:" + (payload.sessionId || "invalid"));
                if (!payload.sessionId || !session) {
                    return done();
                }
            }

            try {
                const user = await um.get(payload);
                assert(user, "User not found");
                assert(!_.includes(user.flags, "disabled"), "User is disabled");

                // Copy OAuth scopes to request
                if (payload.scope) {
                    req.grantedScopes = _.isArray(payload.scope) ? payload.scope : _.isString(payload.scope) ? payload.scope.split(" ") : [];
                }

                done(null, user);
            } catch (e) {
                done();
            }
        }))

        // Passport: Accesstoken Login
        passport.use("accesstoken", new AccessTokenStrategy((token, done) => {
            // Query user id by access token
            sm.accessToken.user(token).then(user => done(null, user)).catch(done);
        }))

        // Passport: Token Login
        passport.use("token", new CustomStrategy(async (req, done) => {
            // Init
            const params = req.method === "GET" ? req.query : req.body;

            // Init login model
            const model = _.pick(params, "uid", "email", "forename", "surname", "photo");
            model.locale = params.locale || params.lang;

            // Check secruity (1)
            if (config.security.anonymous) {
                if (!model.uid) {
                    model.uid = "anonymous";
                    model.email = "anonymous@local";
                    model.forename = "Anonymous";
                    model.surname = "User";
                }
            } else {
                assert(model.uid, "Anonymous access not allowed: No uid specified");
            }

            // Grab appid aka group name from request
            const groupName = params.appid;
            assert(groupName, "No appid specified");

            // Grab user token from request
            const token = params.token;
            assert(token, "No token specified");

            // Query group
            const groupId = "group-" + groupName;
            try {
                const group = await gm.get(groupId);

                // Assert group
                assert(group, "Group not found: " + groupId);

                // FIXME: Check if group has flag 'organization'?
                // FIXME: Check if group is disabled? aka flag 'disabled'?

                // Query secret from group's properties
                const secret = group.properties && group.properties.secret;
                assert(secret, "No secret specified: " + groupId);

                // Build validation token
                const tokenT = sm.hash(model.uid, secret);

                // Validate token
                assert(tokenT === token, "Invalid token specified");

                // Okay, everything is secure, log in user...
                const user = await um.merge(model, { valid: true });

                // Add user to group
                await gm.addMember(group, user);

                // Login user
                await um.login(user.id);
                return done(null, user);
            } catch (e) {
                done();
            }
        }))

        // Passport: Onetime Login
        passport.use("onetimelogin", new CustomStrategy(async (req, done) => {
            // Init
            const token = req.query.token;
            assert(token, "No token specified");

            try {
                // Query user
                const user = await um.byProperty("onetimelogintoken", token);
                // Assert user
                if (!user) {
                    return done();
                }

                // User found, remove onetime token
                if (user.properties) {
                    delete user.properties.onetimelogintoken;
                }

                // Update and login user
                await um.update(user);
                await um.login(user.id);
                return done(null, user);
            } catch (e) {
                done();
            }
        }))

        // Serialize user
        passport.serializeUser((user, done) => {
            done(null, user.id);
        })

        // Deserialize user
        passport.deserializeUser((id, done) => {
            um.get(id).then(user => {
                done(null, um.isTemp(id) ? {
                    id
                } : user);
            }).catch(done);
        })
    }

    // Meta checks webhook api when adding it
    onMetaCheck(req, res) {
        const challenge = req.query["hub.challenge"];
        const verify_token = req.query["hub.verify_token"];

        if (verify_token === bl("config").meta.token) {
            return res.status(200).send(challenge);
        }
        return res.status(400).send({ message: "Bad request!" });
    }

    verifyMetaSignature(secret) {
        assert(secret, 'Webhook secret is required');

        return (req, res, next) => {
            const signature = req.headers["x-hub-signature-256"];
            assert(signature, 'Meta signature is missing');

            const expectedSignature = "sha256=" + crypto
                .createHmac("sha256", secret)
                .update(req.rawBody)
                .digest("hex");

            try {
                const isValid = crypto.timingSafeEqual(
                    Buffer.from(signature),
                    Buffer.from(expectedSignature)
                );

                return isValid ? next() : res.status(401).end();
            } catch {
                res.status(401).end();
            }
        };
    }
}

module.exports = new SecurityManager();
