const axios = require("axios").default;
const config = bl("config");

class ApiService {
    baseURL = "https://graph.instagram.com/v21.0/";

    exec(method, path, data = null, { headers, params } = {}) {
        return axios({
            method,
            url: `${this.baseURL}${path}`,
            data,
            headers: { Authorization: `Bearer ${config.instagram.token}`, ...headers },
            params,
        });
    }

    get(path, config) {
        return this.exec("get", path, config);
    }

    post(path, body = null, config = {}) {
        return this.exec("post", path, body, config);
    }
}

module.exports = ApiService;
