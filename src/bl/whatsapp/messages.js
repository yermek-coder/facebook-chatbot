const db = bl("db");
const em = bl("event");
const { whatsappApi } = bl("meta/api");
const config = bl("config");
const ai = bl("ai");

class MessagesService {
    constructor() {
        em.on("whatsapp/text", (event, payload) => this.handleTextEvent(event, payload));
        em.on("whatsapp/messagestatus", (event) => this.handleStatusEvent(event));
    }

    async handleTextEvent(event, payload) {
        if (event === "created") {
            payload.isEcho = false
            payload.status = "read"

            await this.saveMessage(payload);

            if (!payload?.isEcho) {
                const history = await this.getConversationHistory(payload.sender);

                const accountid = payload.recipient?.id || payload.recipient
                const message = (await ai.execute("generateMessage", { product: 'whatsapp', accountid, history }));

                const sendResponse = await this.sendMessage(payload.sender, message);
                this.handleSentMessage(sendResponse, message);
            }

        }
    }

    async saveMessage(message) {
        // Save new user
        if (!(await db.count("whatsapp_users", { id: message.sender.id }))) {
            const { id, phone, name } = message.sender;
            await db.create("whatsapp_users", { id, phone, name });
        }
        if (!(await db.count("whatsapp_users", { id: message.recipient.id }))) {
            const { id, phone, name } = message.recipient;
            await db.create("whatsapp_users", { id, phone, name });
        }

        const { id, type, timestamp, text } = message;
        return db.create("whatsapp_messages", {
            id,
            type,
            timestamp,
            text,
            is_echo: message.isEcho,
            sender: message.sender.id,
            recipient: message.recipient.id,
        });
    }

    async getConversationHistory(user, limit = 10) {
        const ref = user?.id || user;
        const history = await db.findAll("whatsapp_messages", [{ sender: ref }, { recipient: ref }], {
            orderBy: "timestamp",
            limit,
        });
        return history.map((item) => ({
            role: item.is_echo ? "assistant" : "user",
            content: item.text,
        }));
    }

    sendMessage(recipient, text) {
        const recipientId = recipient?.id || recipient;
        return whatsappApi.post(config.whatsapp.userId + "/messages", {
            messaging_product: "whatsapp",
            to: recipientId,
            recipient_type: "individual",
            type: "text",
            text: {
                preview_url: false,
                body: text,
            },
        });
    }

    handleSentMessage(response, text) {
        this.saveMessage({
            id: response.data.messages[0].id,
            type: "text",
            recipient: { id: response.data.contacts[0].wa_id },
            sender: { id: config.whatsapp.userId },
            text,
            isEcho: true,
            timestamp: new Date().toISOString(),
        });
    }

    async handleStatusEvent(event) {
        if (await db.count("whatsapp_messages", { id: event.id })) {
            db.update("whatsapp_messages", { id: event.id }, { status: event.status });
        }
    }
}

module.exports = new MessagesService();
