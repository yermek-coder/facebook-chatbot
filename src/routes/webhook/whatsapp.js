const webhookManager = bl("whatsapp/webhook");
const sm = bl('security');
const config = bl("config")
const verifyMeta = sm.verifyMetaSignature(config.meta.appSecret);

// Routes
module.exports = require("express")
    .Router()
    .post("/webhook/whatsapp", verifyMeta, async (req, res) => {
        webhookManager.onEvent(req);
        res.sendStatus(200);
    })
    // Meta's check if endpoint works
    .get("/webhook/whatsapp", sm.onMetaCheck);
