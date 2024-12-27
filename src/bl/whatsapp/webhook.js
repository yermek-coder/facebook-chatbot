const em = bl("event");

class WhatsappWebhookManager {
    async onEvent(req) {
        const body = req.body.entry[0].changes[0].value;
        const message = body?.messages?.[0];
        const status = body?.statuses?.[0];

        if (message) {
            const event = {
                type: message.type,
                action: "created",
                timestamp: new Date(message.timestamp * 1000).toISOString(),
                sender: {
                    name: body.contacts[0].profile.name,
                    id: body.contacts[0].wa_id,
                },
                recipient: {
                    phone: body.metadata.display_phone_number,
                    id: body.metadata.phone_number_id,
                },
                text: message.text?.body,
                id: message.id,
            };

            if (message.audio) {
                event.audio = {
                    mimeType: message.audio.mime_type,
                    sha256: message.audio.sha256,
                    id: message.audio.id,
                    voice: message.audio.voice,
                };
                event.type = "audio";
            }

            em.emitp("whatsapp/" + event.type, event.action, event);
        } else if (status) {
            em.emitp("whatsapp/messagestatus", {
                id: status.id,
                status: status.status,
                timestamp: status.timestamp,
                recipient: status.recipient_id,
                conversation: status.conversation?.id,
            });
        }
    }
}

module.exports = new WhatsappWebhookManager();
