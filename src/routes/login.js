const passport = require("passport");
const pm = bl("provider");
const sm = bl("security");

// Routes
module.exports = require("express")
    .Router()

    .get("/login", (req, res) => {
        const handler = pm.supports("loginflow", "login").shift();
        if (handler) {
            handler.login(req, res);
        } else {
            res.redirect(`/global/login?r=${encodeURIComponent(req.query.r || "")}`);
        }
    })

    .post("/login", passport.authenticate("json"), (req, res) => {
        res.json({
            status: "ok",
            redirect: req.body.r
        });
    })

    .get("/logout", (req, res) => {
        const user = req.user;

        req.logout(() => {
            const handler = pm.supports("loginflow", "logout").shift();
            if (handler) {
                handler.logout(req, res, user);
            } else {
                res.redirect("/");
            }
        });
    });
