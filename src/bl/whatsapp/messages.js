const DB = bl("meta/db");
const em = bl("event");
const { whatsappApi } = bl("meta/api");
const config = bl("config");
const chatgptService = bl("chatgpt");

class MessagesService extends DB {
    constructor() {
        super([
            `CREATE TABLE IF NOT EXISTS whatsapp_users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255),
                phone VARCHAR(20)
            );`,
            `CREATE TABLE IF NOT EXISTS whatsapp_messages (
                id VARCHAR(255) PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                timestamp TIMESTAMP NOT NULL,
                sender_id VARCHAR(255) NOT NULL,
                recipient_id VARCHAR(255) NOT NULL,
                text TEXT,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (recipient_id) REFERENCES users(id)
            );`,
            `CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
            CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender ON whatsapp_messages(sender_id);
            CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient ON whatsapp_messages(recipient_id);
            CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone ON whatsapp_users(phone);`,
        ]);

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
        const client = await this.pool.connect();

        try {
            // Start transaction
            await client.query("BEGIN");

            // Check and insert sender
            const senderResult = await client.query(
                "INSERT INTO whatsapp_users (id, name, phone) VALUES ($1, $2, NULL) " +
                    "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name " +
                    "RETURNING id",
                [message.sender.id, message.sender.name]
            );

            // Check and insert recipient
            const recipientResult = await client.query(
                "INSERT INTO whatsapp_users (id, name, phone) VALUES ($1, NULL, $2) " +
                    "ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone " +
                    "RETURNING id",
                [message.recipient.id, message.recipient.phone]
            );

            // Insert event
            await client.query(
                "INSERT INTO whatsapp_messages (id, type, timestamp, sender_id, recipient_id, text) " +
                    "VALUES ($1, $2, $3, $4, $5, $6)",
                [
                    message.id,
                    message.type,
                    message.timestamp,
                    senderResult.rows[0].id,
                    recipientResult.rows[0].id,
                    message.text,
                ]
            );

            // Commit transaction
            await client.query("COMMIT");

            return { success: true, message: "Event inserted successfully" };
        } catch (error) {
            // Rollback in case of error
            await client.query("ROLLBACK");
            throw error;
        } finally {
            // Release the client back to the pool
            client.release();
        }
    }

    async getConversationHistory(userId, limit = 10) {
        const query = `
            SELECT *
            FROM whatsapp_messages
            WHERE sender_id = $1 OR recipient_id = $1
            ORDER BY timestamp ASC
            LIMIT $2
        `;

        try {
            const result = await this.pool.query(query, [userId, limit]);
            return result.rows;
        } catch (error) {
            console.error("Error getting conversation history:", error);
            throw error;
        }
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
