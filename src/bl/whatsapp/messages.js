const db = bl("db");
const em = bl("event");
const { whatsappApi } = bl("meta/api");
const config = bl("config");
const chatgptService = bl("chatgpt");

class MessagesService {
    constructor() {
        em.on("whatsapp/text", (event, payload) => this.handleTextEvent(event, payload));
    }

    async handleTextEvent(event, payload) {
        if (event === "created") {
            await this.saveMessage(payload);

            const history = await this.getConversationHistory(payload.sender.id);
            const response = await chatgptService.getResponse(
                history.map((item) => ({
                    role: item.sender_id === config.whatsapp.userId ? "assistant" : "user",
                    content: item.text,
                }))
            );
            this.sendMessage(payload.sender, response.content);
        }
    }

    async saveMessage(message) {
        console.log(await db.count("whatsapp_users", { id: message.sender.id }));

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
        await db.create("whatsapp_messages", {
            id,
            type,
            timestamp,
            text,
            sender: message.sender.id,
            recipient: message.recipient.id,
        });

        return { success: true, message: "Event inserted successfully" };
    }

    async getConversationHistory(userId, limit = 10) {
        return db.findAll("whatsapp_messages", [{ sender: userId }, { recipient: userId }], {
            orderBy: "timestamp",
            limit,
        });
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
}

module.exports = new MessagesService();
