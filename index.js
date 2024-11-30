require("dotenv").config();
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Hello World! Running in " + process.env.NODE_ENV + " mode");
});

app.post("/", (req, res) => {
    res.send("Post req");
});

app.listen(port);
