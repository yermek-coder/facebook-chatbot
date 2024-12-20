const { instagramApi } = bl("meta/api");
const DB = bl("meta/db");
const chatgptService = bl("chatgpt");
const em = bl("event");
const config = bl("config");

class CommentsService extends DB {
    constructor() {
        super([
            `CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                cid VARCHAR(200) UNIQUE,
                media_id VARCHAR(50),
                media_type VARCHAR(20),
                parent_id VARCHAR(50),
                from_id VARCHAR(50),
                from_username VARCHAR(50),
                text TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
        ]);

        em.on("instagram/comment", (event, payload) => this.handleCommentEvent(event, payload));
    }

    async handleCommentEvent(event, payload) {
        if (event === "created") {
            await this.saveComment(payload);

            if (payload.sender.id === config.instagram.userId) {
                // const history = this.getCommentsHistory(payload);
            }
        }
    }

    async saveComment(comment) {
        const query = `
                INSERT INTO comments (cid, text, timestamp, parent_id, from_id, from_username, media_id, media_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `;

        try {
            const result = await this.pool.query(query, [
                comment.id,
                comment.text,
                comment.timestamp,
                comment.parentId,
                comment.sender.id,
                comment.sender.username,
                comment.media.id,
                comment.media.type,
            ]);
            return result.rows[0];
        } catch (error) {
            console.error("Error saving message:", error);
            throw error;
        }
    }

    async getCommentsHistory(comment, limit = 10) {
        const { sender, parentId, media } = comment;
        const query = `
            SELECT *
            FROM comments
            WHERE sender_id = $1
            ORDER BY timestamp ASC
            LIMIT $2
        `;

        try {
            const result = await this.pool.query(query, [id, limit]);
            return result.rows;
        } catch (error) {
            console.error("Error getting conversation history:", error);
            throw error;
        }
    }

    replyToComment(comment, message) {
        return instagramApi.post(`${comment}/replies`, { message });
    }

    createComment(mediaId, text) {
        return instagramApi.post(`${mediaId}/comments?message=${encodeURIComponent(text)}`);
    }
}

module.exports = new CommentsService();
