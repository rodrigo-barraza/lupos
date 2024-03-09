require('dotenv/config');
const Anthropic = require('@anthropic-ai/sdk');
const {
    LANGUAGE_MODEL_TEMPERATURE,
    LANGUAGE_MODEL_MAX_TOKENS,
    ANTHROPIC_LANGUAGE_MODEL_POWERFUL,
    ANTHROPIC_LANGUAGE_MODEL_FAST,
    ANTHROPIC_KEY
} = require('../config.json');

const anthropic = new Anthropic({apiKey: ANTHROPIC_KEY})

const AnthrophicWrapper = {
    async generateText(conversation, tokens, performance) {
        let text;
        let systemMessage;
        if (conversation[0].role === 'system') {
            systemMessage = conversation.shift().content;
        }
        // remove name property from object in conversation
        conversation = conversation.map((message) => {
            if (message.name) {
                delete message.name;
            }
            return message;
        });

        const mergedData = conversation.reduce((acc, cur, index, array) => {
            if (cur.role === "user" || cur.role === "assistant") {
              if (acc.length && acc[acc.length - 1].role === cur.role) {
                if (cur.role === "user" && (index === array.length - 1 || array[index + 1].role !== "user")) {
                  acc[acc.length - 1].content += `# Directly reply to this message:\n\n${cur.content}\n\n`;
                } else {
                  acc[acc.length - 1].content += `${cur.content}\n\n`;
                }
              } else {
                acc.push(cur);
              }
            }
            return acc;
          }, []);

        if (mergedData[0].role === "assistant") {
            mergedData.shift();
        }

        const response = await anthropic.messages.create({
            system: systemMessage,
            temperature: LANGUAGE_MODEL_TEMPERATURE,
            model: performance === 'POWERFUL' ? ANTHROPIC_LANGUAGE_MODEL_POWERFUL : ANTHROPIC_LANGUAGE_MODEL_FAST,
            messages: mergedData,
            max_tokens: tokens ? tokens : LANGUAGE_MODEL_MAX_TOKENS,
        }).catch((error) => console.error('OpenAI Error:\n', error));

        if (response.content[0].text) {
            text = response.content[0].text;
        }
        return text;
    },
};

module.exports = AnthrophicWrapper;
