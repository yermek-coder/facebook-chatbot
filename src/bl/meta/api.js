const axios = require("axios").default;
const config = bl("config");

class ApiService {
    constructor(url, token) {
        this.baseURL = url;
        this.token = token;
    }
    baseURL;
    token;

    exec(method, path, data = null, { headers, params } = {}) {
        return axios({
            method,
            url: `${this.baseURL}${path}`,
            data,
            headers: { Authorization: `Bearer ${this.token}`, ...headers },
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

module.exports = {
    instagramApi: new ApiService("https://graph.instagram.com/v21.0/", config.instagram.token),
    whatsappApi: new ApiService("https://graph.facebook.com/v21.0/", config.whatsapp.token),
};
