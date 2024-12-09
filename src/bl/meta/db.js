const { Pool } = require("pg");
const config = bl("config");

class DB {
    constructor(queries) {
        this.pool = new Pool({
            user: config.db.user,
            host: config.db.host,
            database: config.db.name,
            password: config.db.password,
            port: config.db.port,
        });

        this.initializeTable(queries);
    }

    async initializeTable(queries) {
        try {
            for (const query of queries) {
                await this.pool.query(query);
            }
        } catch (error) {
            console.error("Error initializing table:", error);
            throw error;
        }
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = DB;
