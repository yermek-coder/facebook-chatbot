// Routes
const path = require("path");

module.exports = require("express")
    .Router()
    .get("/privacy-policy", async (req, res) => {
        res.sendFile(path.join(__dirname, "../views/privacy-policy.html"));
    });
