const ui = bl("ui");

// Routes
module.exports = require("express")
    .Router()

    /**
     * @endpoint Ui.Config
     * description: Get UI configuration for current user
     * method: get
     * path: ${basename}
     * returns: UiConfig
     */
    .get("/config", (req, res) => {
        res.json(ui.config(req).then(result => result.config));
    });
