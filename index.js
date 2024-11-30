require("dotenv").config();
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("272359280");
});

app.post("/", (req, res) => {
    res.send("Post req");
});

app.listen(port);
