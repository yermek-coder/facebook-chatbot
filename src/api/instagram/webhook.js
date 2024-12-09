const webhookManager = bl("instagram/webhook");

// Routes
module.exports = require("express")
    .Router()
    .post("/", async (req, res) => {
        webhookManager.onEvent(req);
        res.sendStatus(200);
    })
    // Meta's check if endpoint works
    .get("/", webhookManager.onMetaCheck);
