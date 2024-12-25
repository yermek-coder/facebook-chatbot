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
            await this.saveComment(payload);

            console.log("payload", payload);

            if (payload.sender.id !== config.instagram.userId) {
                const history = await this.getCommentsHistory(payload);
                console.log("history", history);
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
        return db.findAll("instagram_comments", condition, { orderBy: "timestamp", limit });
    }

    replyToComment(comment, message) {
        return instagramApi.post(`${comment}/replies`, { message });
    }

    createComment(mediaId, text) {
        return instagramApi.post(`${mediaId}/comments?message=${encodeURIComponent(text)}`);
    }
}

module.exports = new CommentsService();
