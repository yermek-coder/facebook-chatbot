const Url = require("url").URL;

const HOST = "localhost";
const PORT = process.env.PORT || 3000;
const URL = process.env.URL || "http://" + HOST + ":" + PORT;
const HOSTNAME = new Url(URL).hostname;

module.exports = {
    app: HOSTNAME,
    url: URL,
    port: PORT,
    dev: process.env.DEV === "true",

    meta: {
        token: process.env.META_VERIFICATION_TOKEN,
        appSecret: process.env.META_APP_SERCRET
    },

    instagram: {
        userId: process.env.INSTAGRAM_USER_ID,
        token: process.env.INSTAGRAM_TOKEN,
        appSecret: process.env.INST_APP_SERCRET
    },

    whatsapp: {
        token: process.env.WHATSAPP_TOKEN,
        userId: process.env.WHATSAPP_USER_ID
    },

    db: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        name: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT
    },

    chatgpt: {
        baseUrl: process.env.CHATGPT_BASE_URL || "https://api.openai.com/v1",
        apiKey: process.env.CHATGPT_APIKEY,
        model: process.env.CHATGPT_MODEL || "gpt-4o-mini",
        limit: parseInt(process.env.CHATGPT_LIMIT || "5000")
    },

    security: {
        sessionSecret: process.env.SESSION_SECRET,
        accesstoken: {
            header: "x-accesstoken",
            expire: 86400
        },
        jwt: {
            enabled: process.env.JWT === "true",
            header: process.env.JWT_HEADER || "x-jwt",
            secret: process.env.JWT_SECRET || ("jsdf72h0sdfh23390hfuhvhg34uzvsdf" + URL),
            ttl: parseInt(process.env.JWT_TTL || "0") || 60 * 60 * 24,
            expireIn: process.env.JWT_EXPIRE_IN || "30days",
            validateSession: process.env.JWT_VALIDATE_SESSION != "false"
        },
    },

    redis: {
        host: process.env.REDIS_HOST || "redis",
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PW,
        no_ready_check: true
    }
};
