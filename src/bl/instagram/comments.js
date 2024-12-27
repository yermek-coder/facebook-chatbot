const { instagramApi } = bl("meta/api");
const db = bl("db");
const chatgptService = bl("chatgpt");
const em = bl("event");
const config = bl("config");

class CommentsService {
    constructor() {
        em.on("instagram/comment", (event, payload) => this.handleCommentEvent(event, payload));
    }

    async handleCommentEvent(event, payload) {
        if (event === "created") {
            const moderation = await chatgptService.getModeration(payload.text);
            if (moderation?.flagged) {
                this.deleteComment(payload.id);
                console.log("Comment deleted", payload.sender.id, payload.text);
            } else {
                await this.saveComment(payload);

                if (payload.sender.id !== config.instagram.userId) {
                    const history = await this.getCommentsHistory(payload);
                    const response = await chatgptService.getResponse(history);

                    this.replyToComment(payload.id, response.content);
                }
            }
        }
    }

    async saveComment(comment) {
        // Save new user
        if (!(await db.count("instagram_users", { id: comment.sender.id }))) {
            const { id, username } = comment.sender;
            await db.create("instagram_users", { id, username });
        }

        // Save new media
        if (!(await db.count("instagram_media", { id: comment.media.id }))) {
            const { id, type } = comment.media;
            await db.create("instagram_media", { id, type });
        }

        return db.create("instagram_comments", {
            id: comment.id,
            text: comment.text,
            timestamp: comment.timestamp,
            parent: comment.parentId,
            sender: comment.sender.id,
            media: comment.media.id,
        });
    }

    async getCommentsHistory(comment, limit = 10) {
        const condition = { media: comment.media.id };
        if (comment.parentId) {
            condition.parent = comment.parentId;
        } else {
            condition.sender = comment.sender.id;
        }

        const history = await db.findAll("instagram_comments", condition, {
            orderBy: "timestamp",
            order: "DESC",
            limit,
        });
        return history.reverse().map((item) => ({
            role: item.sender === config.instagram.userId ? "assistant" : "user",
            content: item.text,
        }));
    }

    replyToComment(comment, message) {
        return instagramApi.post(`${comment}/replies`, { message });
    }

    createComment(mediaId, text) {
        return instagramApi.post(`${mediaId}/comments?message=${encodeURIComponent(text)}`);
    }

    deleteComment(commentId) {
        return instagramApi.delete(commentId);
    }
}

module.exports = new CommentsService();
