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

    // metaAppSecret: process.env.META_APP_SERCRET,
    // instAppSecret: process.env.INST_APP_SERCRET,
    // metaToken: process.env.META_VERIFICATION_TOKEN,
    // instToken: process.env.INSTAGRAM_TOKEN,
    // instUser: ,

    meta: {
        token: process.env.META_VERIFICATION_TOKEN,
        appSecret: process.env.META_APP_SERCRET,
    },

    instagram: {
        user: process.env.INSTAGRAM_USER,
        token: process.env.INSTAGRAM_TOKEN,
        appSecret: process.env.INST_APP_SERCRET,
    },

    whatsapp: {},

    db: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        name: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    },

    chatgpt: {
        baseUrl: process.env.CHATGPT_BASE_URL || "https://api.openai.com/v1",
        apiKey: process.env.CHATGPT_APIKEY,
        model: process.env.CHATGPT_MODEL || "gpt-4o-mini",
        limit: parseInt(process.env.CHATGPT_LIMIT || "5000"),
    },
};
