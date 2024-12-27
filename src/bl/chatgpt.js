// const assert = require("assert");
// const config = bl("config");
// const axios = require("axios").default;

// class ChatgptService {
//     isEnabled() {
//         return !!config.chatgpt.apiKey;
//     }

//     // https://platform.openai.com/docs/guides/moderation

//     // https://platform.openai.com/docs/guides/speech-to-text

//     exec(path, body) {
//         return axios.post(`${config.chatgpt.baseUrl}/${path}`, body, {
//             headers: { Authorization: `Bearer ${config.chatgpt.apiKey}` },
//         })
//     }

//     chatCompletions(model) {
//         // Asserts
//         assert(model, "Invalid model");
//         assert(this.isEnabled(), "No/Invalid ChatGPT API key");

//         // Invoke request body
//         return this.exec(`chat/completions`, model);
//     }

//     systemMessage = {
//         role: "system",
//         content: `
//             Ты чат бот парикмахерской "Алтыншаш". Будь вежлив и услужлив
//         `,
//     };

//     async getResponse(messages) {
//         const response = await this.chatCompletions({
//             n: 1,
//             temperature: 0.1,
//             model: config.chatgpt.model,
//             messages: [this.systemMessage, ...messages],
//         });

//         return response.data?.choices[0].message;
//     }

//     async getModeration(text) {
//         const response = await this.exec(moderations, {
//             model: "omni-moderation-latest", input: text,
//         });
//         return response.data?.results?.[0];
//     }
// }

// module.exports = new ChatgptService();



const axios = require("axios").default;
const assert = require("assert");
const _ = require("underscore");
const config = bl("config");
const logger = bl("logger")(module);

class ChatGptManager {
    isEnabled() {
        return !!config.chatgpt.apiKey;
    }

    chatCompletions(model) {
        // Asserts
        assert(model, "Invalid model");
        assert(this.isEnabled(), "No/Invalid ChatGPT API key");

        // Invoke request body
        return axios.post(`${config.chatgpt.baseUrl}/chat/completions`, model, { headers: { Authorization: `Bearer ${config.chatgpt.apiKey}` } });
    }

    /**
     * @param {*} response ChatGPT API response
     * @return {string} first assistant message from ChatGPT API response
     */
    extractFirstChoice(response) {
        if (response.data?.choices?.length > 0) {
            return response.data.choices[0].message?.content || "Error";
        }

        return "Error";
    }

    /**
     * @typedef FunctionDefinition
     * @property {string} name
     * @property {object} declaration
     * @property {function} execute
     */

    /**
     * The way it basically works:
     *   1) Query ChatGPT with messages
     *   2) Parse the response for function calls
     *   3) Call functions and add results to messages
     *   4) Goto 1
     *
     * @param {*} messages
     * @param {*} user
     * @param {Array<FunctionDefinition>} functions
     * @param {*} level
     * @returns
     */
    async workhorse(messages, user, params, functions, level = 0) {
        // Recursive level check
        assert(level <= 25, "Recursion stopped");

        // Execute query to ChatGPT
        const response = await this.chatCompletions({
            n: 1,
            temperature: 0.1,
            model: "gpt-4o",
            // model: "gpt-4-turbo",
            messages,
            tools: functions.map(fn => ({ type: "function", function: fn.declaration }))
        });

        // Extract response message and append into to history
        const message = response.data?.choices[0].message;
        messages.push(message);

        // Do any functions have to be called?
        if (message.tool_calls?.length > 0) {
            // Append current response message
            logger.debug("-> Function calls");

            // Execute calls (in parallel)
            const functionExecutions = message.tool_calls.map(async call => {
                // Execute function w/ given arguments
                logger.debug(`- ${call.function.name}: %s`, call.function.arguments);

                // Find and execute function
                const fn = functions.find(f => f.declaration?.name == call.function.name);
                assert(fn, "Function not found:" + call.function.name);
                const functionResult = await fn.execute(JSON.parse(call.function.arguments), user, params);

                // Append function response as message
                messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: JSON.stringify(functionResult) });

                // Return result
                return functionResult;
            });

            // Execute functions
            const functionResults = await Promise.all(functionExecutions);

            // Was a 'final' function called?
            for (const functionResult of functionResults) {
                if (functionResult?.flags?.includes("final")) {
                    logger.debug("-> Finish: %s", functionResult);
                    return _.omit(functionResult, "flags");
                }
            }
        } else {
            // We're finished: No more function calls
            logger.debug("-> Finish: %s", message.content);
            return message;
        }

        // Recursively invoke workhorse
        return this.workhorse(messages, user, params, functions, level + 1);
    }
}

module.exports = new ChatGptManager();
