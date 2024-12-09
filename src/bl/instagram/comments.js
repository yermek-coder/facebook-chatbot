const api = bl("meta/api");
const DB = bl("meta/db");
const chatgptService = bl("chatgpt");
const em = bl("event");

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
            const result = await this.saveComment(payload);
            console.log("result1", result);
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
                comment.from.id,
                comment.from.username,
                comment.media.id,
                comment.media.type,
            ]);
            return result.rows[0];
        } catch (error) {
            console.error("Error saving message:", error);
            throw error;
        }
    }

    async getCommentsHistory(userId, limit = 10) {
        const query = `
            SELECT *
            FROM messages
            WHERE sender_id = $1
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

    replyToComment(comment, message) {
        return api.post(`${comment}/replies`, { message });
    }

    createComment(mediaId, text) {
        return api.post(`${mediaId}/comments?message=${encodeURIComponent(text)}`);
    }
}

module.exports = new CommentsService();
