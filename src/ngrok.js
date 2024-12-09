require("dotenv").config();
const ngrok = require("ngrok");

const port = process.env.PORT || 3000;

try {
    // Start ngrok tunnel using auth token from .env
    ngrok
        .connect({
            proto: "http",
            hostname: process.env.NGROK_HOSTNAME,
            addr: port,
            authtoken: process.env.NGROK_AUTH_TOKEN,
        })
        .then((addr) => console.log("addr", addr));
} catch (err) {
    console.error("Error setting up ngrok:", err);
}
