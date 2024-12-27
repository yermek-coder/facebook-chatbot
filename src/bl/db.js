const { Pool } = require("pg");
const config = bl("config");

class Database {
    constructor(config) {
        this.pool = new Pool({
            user: config.db.user,
            host: config.db.host,
            database: config.db.name,
            password: config.db.password,
            port: config.db.port,
        });

        this.pool.on("error", (err) => {
            console.error("Unexpected error on idle client", err);
        });
    }

    async query(text, params) {
        try {
            const start = Date.now();
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            // console.log("Executed query", { text, duration, rows: res.rowCount });
            return res;
        } catch (err) {
            console.error("Error executing query", err);
            throw err;
        }
    }

    // ORM-like methods
    async findOne(table, conditions = {}) {
        const entries = Object.entries(conditions);
        const whereClause = entries.length
            ? `WHERE ${entries.map(([key], i) => `${key} = $${i + 1}`).join(" AND ")}`
            : "";
        const values = entries.map(([_, value]) => value);

        const query = `SELECT * FROM ${table} ${whereClause} LIMIT 1`;
        const result = await this.query(query, values);
        return result.rows[0];
    }

    buildWhereClause(conditions, startingParamIndex = 1) {
        if (!conditions || Object.keys(conditions).length === 0) {
            return { text: "", values: [], paramCount: startingParamIndex };
        }

        let values = [];
        let clauses = [];
        let paramCount = startingParamIndex;

        if (Array.isArray(conditions)) {
            // Handle OR conditions
            clauses = conditions.map((condition) => {
                const {
                    text,
                    values: condValues,
                    paramCount: newParamCount,
                } = this.buildWhereClause(condition, paramCount);
                paramCount = newParamCount;
                values.push(...condValues);
                return `(${text})`;
            });
            return {
                text: clauses.join(" OR "),
                values,
                paramCount,
            };
        }

        // Handle regular object conditions (AND)
        for (const [key, value] of Object.entries(conditions)) {
            if (value === null) {
                clauses.push(`${key} IS NULL`);
            } else {
                clauses.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        return {
            text: clauses.join(" AND "),
            values,
            paramCount,
        };
    }

    async findAll(table, conditions = {}, options = {}) {
        const { text: whereClause, values } = this.buildWhereClause(conditions);

        let query = `SELECT * FROM ${table}`;
        if (whereClause) {
            query += ` WHERE ${whereClause}`;
        }

        if (options.orderBy) {
            query += ` ORDER BY ${options.orderBy} ${options.order || "ASC"}`;
        }
        if (options.limit) {
            query += ` LIMIT ${options.limit}`;
        }
        if (options.offset) {
            query += ` OFFSET ${options.offset}`;
        }

        const result = await this.query(query, values);
        return result.rows;
    }

    async create(table, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const query = `
            INSERT INTO ${table} (${keys.join(", ")})
            VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})
            RETURNING *
        `;
        const result = await this.query(query, values);
        return result.rows[0];
    }

    async update(table, conditions, data) {
        const setEntries = Object.entries(data);
        const whereEntries = Object.entries(conditions);

        const setClause = setEntries.map(([key], i) => `${key} = $${i + 1}`).join(", ");

        const whereClause = whereEntries.map(([key], i) => `${key} = $${i + 1 + setEntries.length}`).join(" AND ");

        const query = `
            UPDATE ${table}
            SET ${setClause}
            WHERE ${whereClause}
            RETURNING *
        `;

        const values = [...Object.values(data), ...Object.values(conditions)];
        const result = await this.query(query, values);
        return result.rows;
    }

    async delete(table, conditions) {
        const entries = Object.entries(conditions);
        const whereClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(" AND ");

        const query = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
        const values = entries.map(([_, value]) => value);
        const result = await this.query(query, values);
        return result.rows;
    }

    async count(table, conditions = {}) {
        const entries = Object.entries(conditions);
        const whereClause = entries.length
            ? `WHERE ${entries.map(([key], i) => `${key} = $${i + 1}`).join(" AND ")}`
            : "";
        const values = entries.map(([_, value]) => value);

        const query = `SELECT COUNT(*) FROM ${table} ${whereClause}`;
        const result = await this.query(query, values);
        return parseInt(result.rows[0].count);
    }
}

module.exports = new Database(config);
