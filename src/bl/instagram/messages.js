const DB = bl("meta/db");
const chatgptService = bl("chatgpt");
const em = bl("event");
const api = bl("meta/api");

class MessagesService extends DB {
    constructor() {
        super([
            `CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                mid VARCHAR(200) UNIQUE,
                sender_id BIGINT,
                recipient_id BIGINT,
                text TEXT,
                reply_to_type VARCHAR(50),
                reply_to_id VARCHAR(200),
                reply_to_url TEXT,
                is_echo BOOLEAN DEFAULT FALSE,
                quick_reply TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
        ]);

        em.on("instagram/message", (event, payload) => this.handleMessageEvent(event, payload));
    }

    async handleMessageEvent(event, payload) {
        if (event === "created") {
            if (payload?.text) {
                await this.saveMessage(payload);

                if (!payload.isEcho) {
                    // if message is not ours
                    const history = await this.getConversationHistory(payload.sender);
                    const response = await chatgptService.getResponse(
                        history.map((item) => ({
                            role: item.is_echo ? "assistant" : "user",
                            content: item.text,
                        }))
                    );
                    this.sendMessage(payload.sender, response.content);
                }
            }
        } else if (event === "deleted") {
            this.deleteMessage(payload.id);
        }
    }

    async saveMessage(message) {
        const query = `
                INSERT INTO messages (sender_id, recipient_id, text, timestamp, mid, reply_to_type, reply_to_id, reply_to_url, is_echo, quick_reply)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `;

        try {
            const result = await this.pool.query(query, [
                message.sender,
                message.recipient,
                message.text || "",
                message.timestamp,
                message.id,
                message.replyTo.type,
                message.replyTo.id,
                message.replyTo.url,
                message.isEcho,
                message.quickReply,
            ]);
            return result.rows[0];
        } catch (error) {
            console.error("Error saving message:", error);
            throw error;
        }
    }

    async getConversationHistory(userId, limit = 10) {
        const query = `
            SELECT *
            FROM messages
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
        return api.post("me/messages", {
            recipient: {
                id: recipient?.id || recipient,
            },
            message: {
                text,
            },
        });
    }

    async deleteMessage(messageId) {
        const query = "DELETE FROM messages WHERE mid = $1";
        try {
            return this.pool.query(query, [messageId]);
        } catch (error) {
            console.error("Error deleting message:", error);
            throw error;
        }
    }
}

module.exports = new MessagesService();
