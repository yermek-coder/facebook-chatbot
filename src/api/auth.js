const sm = bl("security");
const config = bl("config");

// Routes
module.exports = require("express")
    .Router()

    /**
     * @endpoint Auth.Login
     * description: Login to get access token. This token can be added as a header "x-accesstoken" to all subsequent api calls.
     * method: post
     * path: ${basename}
     * body: EmailPassword
     * returns: AccessToken
     */
    .post("", (req, res) => {
        res.json(sm.login(req, res));
    })

    /**
     * @endpoint Auth.Logout
     * description: Logout current access token. The access tolen as to be set as a header "x-accesstoken".
     * method: post
     * path: ${basename}/logout
     */
    .post("/logout", (req, res) => {
        res.json(sm.logout(req, res));
    })

    /**
     * @endpoint Auth.LoginJwt
     * description: Login to get JWT
     * method: post
     * path: ${basename}/jwt
     * body: EmailPassword
     * returns: JWTToken
     */
    .post("/jwt", (req, res) => {
        if (config.security.jwt.enabled) {
            return res.json(sm.jwtLogin(req));
        }

        res.status(500).json({ message: "Not supported" });
    })

// /**
//  * @endpoint Auth.LoginJwtTotp
//  * description: Validate TOTP to get JWT
//  * method: post
//  * path: ${basename}/jwt/totp
//  * body: TwoFactorToken
//  * returns: JWTToken
//  */
// .post("/jwt/totp", sm.totp.validate, (req, res) => {
//     if (config.security.jwt.enabled) {
//         if (req.totp?.validated) {
//             return res.json(sm.jwt.loginTotp(req));
//         }
//         return res.status(400).json({ message: "Token invalid" });
//     }

//     res.status(500).json({ message: "Not supported" });
// })

// .post("/iam", (req, res) => {
//     return res.json(sm.iam.login(req, res));
// })
