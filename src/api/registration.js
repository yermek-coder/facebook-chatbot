var um = bl("user");

// Routes
module.exports = require("express")
    .Router()

    /**
     * @endpoint Registration.Register
     * description: Register a new user
     * method: post
     * path: ${basename}/register
     * body: Registration
     * returns: User
     */
    .post("/register", (req, res) => {
        res.json(um.register(req.body));
    });
