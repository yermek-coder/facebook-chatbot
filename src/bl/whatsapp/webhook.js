const em = bl("event");
const meta = bl("meta");
const config = bl("config");
const MetaWebhookManager = bl("meta/webhook");

class MetaWebhookService extends MetaWebhookManager {
    async onEvent(req) {
        const verified = meta.verifySignature(req, config.meta.appSecret);

        if (verified) {
            const body = req.body.entry[0].changes[0].value;
            const message = body?.messages?.[0];
            const status = body?.statuses?.[0];

            if (message) {
                const event = {
                    type: message.type,
                    timestamp: new Date(message.timestamp * 1000).toISOString(),
                    sender: message.from,
                    text: message.text.body,
                    id: message.id,
                };

                console.log("message", message);

                em.emitp("whatsapp/" + event.type, "created", event);
            } else if (status) {
                console.log("status", status);
            }
        }
    }
}

module.exports = new MetaWebhookService();
