const chatgpt = bl("chatgpt");
const config = bl("config");
const db = bl("db")
const assert = require('assert')

/**
 *
 * @param {*} system system message
 * @param {*} history array of user messages
 * @returns
 */
async function generateMessage(system, history) {
    // Create model
    const model = {
        temperature: 0.2,
        model: config.chatgpt.model,
        messages: [
            {
                role: "system",
                content: system
            },
            ...history
        ],
        // tool_choice: { type: "function", function: { name: "generate_todos" } },
        // tools: [{
        //     type: "function",
        //     function: {
        //         name: "generate_todos",
        //         description: "Generate TODO list",
        //         parameters: {
        //             type: "object",
        //             properties: {
        //                 task_list: {
        //                     type: "array",
        //                     description: "An array of tasks",
        //                     items: {
        //                         type: "object",
        //                         properties: {
        //                             summary: {
        //                                 type: "string",
        //                                 description: "The description of the tasks"
        //                             },
        //                             people: {
        //                                 type: "array",
        //                                 description: "A list of involved people",
        //                                 items: {
        //                                     type: "string"
        //                                 }
        //                             },
        //                             due_date: {
        //                                 type: "string",
        //                                 description: "A estimated due date if available"
        //                             }
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // }]
    };

    // Execute ChatGPT
    return chatgpt.chatCompletions(model).then(response => response.data?.choices[0].message.content)
    // .then(res => {
    //     const functionArguments = res.data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    //     return JSON.parse(functionArguments || "{}").task_list;
    // });
}

// Export provider declaration
module.exports = {
    supports(model) {
        return model === "generateMessage" && chatgpt.isEnabled();
    },
    async execute({ product, accountid, history }) {
        const prompt = await db.findOne("prompts", { accountid, product })
        assert(prompt, "Prompt for given user not found. User: " + accountid)
        assert(prompt?.text, "Prompt is empty")
        return generateMessage(prompt.text, history);
    }
};
