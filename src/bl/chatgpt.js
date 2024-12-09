const assert = require("assert");
const config = bl("config");
const axios = require("axios").default;

class ChatgptService {
    isEnabled() {
        return !!config.chatgpt.apiKey;
    }

    chatCompletions(model) {
        // Asserts
        assert(model, "Invalid model");
        assert(this.isEnabled(), "No/Invalid ChatGPT API key");

        // Invoke request body
        return axios.post(`${config.chatgpt.baseUrl}/chat/completions`, model, {
            headers: { Authorization: `Bearer ${config.chatgpt.apiKey}` },
        });
    }

    systemMessage = {
        role: "system",
        content: `
            Ты чат бот парикмахерской "Алтыншаш". Будь вежлив и услужлив
        `,
    };

    async getResponse(messages) {
        const response = await this.chatCompletions({
            n: 1,
            temperature: 0.1,
            model: config.chatgpt.model,
            messages: [this.systemMessage, ...messages],
        });

        return response.data?.choices[0].message;
    }
}

module.exports = new ChatgptService();
