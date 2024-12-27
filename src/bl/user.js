const _ = require("underscore");
const assert = require("assert");
const pw = require("password-hash");
const validator = require("email-validator");
// const crypto = require("crypto");
// const { Secret, TOTP } = require("otpauth");

const db = bl("db");
// const mm = bl("mail");
// const im = bl("image");
// const gm = bl("group");
// const ca = bl("cache");
// const crud = bl("crud");
// const config = bl("config");
// const ut = bl("user.tenant");
// const pm = bl("provider");
// const onlinestatus = bl("onlinestatus");

class UserManager {
    async register(model) {
        // Asserts
        assert(model, "Invalid model specified");
        assert(model.email, "Invalid email specified");
        assert(model.terms, "Terms have to be accepted");
        assert(model.password, "Invalid password specified");
        assert(model.password.length >= 4, "Invalid password length (>= 4)");
        model.email = model.email.trim().toLowerCase();
        assert(validator.validate(model.email), "Invalid email specified");

        // Query existing user
        const existing = await this.byEmail(model.email);
        assert(!existing, "User already exists");

        // Default group for now
        let groups = ["admin"];

        // Create and merge user
        let user = _.extend({ groups }, _.pick(model, "email", "forename", "surname", "locale"));
        user = await db.create("users", user);

        await db.create("userauth", {
            userid: user.id,
            hash: pw.generate(model.password)
        });

        // Return user
        return user;
    }

    byEmail(email) {
        assert(email, "No E-Mail specified");
        email = email.trim().toLowerCase();
        return db.findOne("users", { email });
    }

    validate(email, password) {
        assert(password);
        return this.byEmail(email).then(user => {
            return user
                ? db
                    .findOne("userauth", { userid: user.id })
                    .then(auth => (pw.verify(password, auth.hash) ? user : null))
                    .catch(() => null)
                : null
        }
        );
    }

    get(payload) {
        return db.findOne('users', { id: payload.id })
    }
}

module.exports = new UserManager();
