// @ts-check
const pm = bl("provider");

module.exports = {
    async config(req) {
        // Init params
        let params = req.query;

        // If "?refer" is present, use the "referer" header for parsing the http get parameters.
        // This is importing during import of /js/__config, because it has to use the get parameters
        // from the *html file*, not the script url itself.
        if (params && params.refer !== undefined && req.headers.referer) {
            params = (req.headers.referer || "")
                .split("?")
                .pop()
                .split("&")
                .reduce((result, item) => {
                    const [key, val] = item.split("=");
                    if (val) {
                        result[key] = decodeURIComponent(val);
                    }

                    return result;
                }, {});
        }

        // Init config data
        const config = {
            params,
            javascripts: [],
            stylesheets: [],
            css: [],
            version: process.env.npm_package_version
        };

        // Invoke view providers
        await pm.resolve("view", req, "apply", [req, config]);

        // Return config
        return { config };
    }
};
