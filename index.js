require("dotenv").config();
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    const challenge = req.query["hub.challenge"];
    const verify_token = req.query["hub.verify_token"];

    if (verify_token === process.env.META_VERIFICATION_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.status(400).send({ message: "Bad request!" });
});

app.post("/", (req, res) => {
    res.send("Post req");
});

const CLIENT_ID = process.env.META_APP_ID;
const CLIENT_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.HOSTNAME + "/auth/callback";

// Handle the OAuth redirect
app.get("/auth/callback", async (req, res) => {
    try {
        // Get the code from the query parameters
        const code = req.query.code;

        // Exchange the code for an access token
        const tokenResponse = await axios.post("https://api.instagram.com/oauth/access_token", {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
            code: code,
        });

        // Store the access token securely
        const accessToken = tokenResponse.data.access_token;
        // TODO: Save the access token to your database

        // Redirect user to success page
        res.redirect("/success");
    } catch (error) {
        console.error("OAuth Error:", error);
        res.redirect("/error");
    }
});

// Success route
app.get("/success", (req, res) => {
    res.send("Authorization successful! You can close this window.");
});

// Error route
app.get("/error", (req, res) => {
    res.send("Authorization failed. Please try again.");
});

app.listen(port);
