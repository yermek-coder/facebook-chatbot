require("dotenv").config();
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    const challenge = req.query["hub.challenge"];
    const verify_token = req.query["hub.verify_token"];

    if (verify_token === process.env.META_VERIFICATION_TOKEN) {
        return res.status(200).send({ message: "Success", challenge });
    }
    return res.status(400).send({ message: "Bad request!" });
});

app.post("/", (req, res) => {
    res.send("Post req");
});

app.listen(port);
