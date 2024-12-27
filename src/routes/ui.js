const ui = bl("ui");

// Routes
module.exports = require("express")
    .Router()

    .get(["/__config", "/js/__config"], (req, res) => {
        ui.config(req).then(paramsT => {
            res.setHeader("Content-Type", "text/javascript; charset=UTF-8");
            res.write(`var __config = ${JSON.stringify(paramsT.config)};`);
            res.end();
        });
    })

    .get("/ui/config", (req, res) => {
        ui.config(req).then(paramsT => res.json(paramsT.config));
    });
