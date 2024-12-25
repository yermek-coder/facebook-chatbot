const db = bl("db");
const chatgptService = bl("chatgpt");
const em = bl("event");
const { instagramApi } = bl("meta/api");

class MessagesService {
    constructor() {
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
        // Save new user
        if (!(await db.count("instagram_users", { id: message.sender.id }))) {
            await db.create("instagram_users", message.sender);
        }
        if (!(await db.count("instagram_users", { id: message.recipient.id }))) {
            await db.create("instagram_users", message.recipient);
        }

        const entry = {
            sender: message.sender.id,
            recipient: message.recipient.id,
            text: message.text || "",
            timestamp: message.timestamp,
            id: message.id,
            is_echo: message.isEcho,
            quick_reply: message.quickReply,
        };

        if (message?.replyTo) {
            entry.reply_to_message = message.replyTo.id;

            if (message.replyTo?.story) {
                entry.reply_to_story = message.replyTo.story.d;
                // Save new story
                if (!(await db.count("instagram_story", { id: message.replyTo.story.id }))) {
                    await db.create("instagram_story", {
                        id: message.replyTo.story.id,
                        url: message.replyTo.story.url,
                    });
                }
            }
        }

        return db.create("instagram_messages", entry);
    }

    async getConversationHistory(user, limit = 10) {
        const ref = user?.id || user;
        return db.findAll("instagram_messages", [{ sender: ref }, { recipient: ref }], {
            orderBy: "timestamp",
            limit,
        });
    }

    sendMessage(recipient, text) {
        return instagramApi.post("me/messages", {
            recipient: {
                id: recipient?.id || recipient,
            },
            message: {
                text,
            },
        });
    }

    async deleteMessage(messageId) {
        return db.delete("instagram_messages", { id: messageId });
    }
}

module.exports = new MessagesService();
