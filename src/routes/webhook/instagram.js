const webhookManager = bl("instagram/webhook");
const sm = bl("security");
const config = bl("config")
const verifyMeta = sm.verifyMetaSignature(config.instagram.appSecret);

// Routes
module.exports = require("express")
    .Router()
    .post("/webhook/instagram", verifyMeta, async (req, res) => {
        webhookManager.onEvent(req);
        res.sendStatus(200);
    })
    // Meta's check if endpoint works
    .get("/webhook/instagram", sm.onMetaCheck);
