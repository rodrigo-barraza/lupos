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

        const last = conversation[conversation.length - 1];

        const response = await anthropic.messages.create({
            system: systemMessage,
            temperature: LANGUAGE_MODEL_TEMPERATURE,
            model: performance === 'POWERFUL' ? ANTHROPIC_LANGUAGE_MODEL_POWERFUL : ANTHROPIC_LANGUAGE_MODEL_FAST,
            messages: [last],
            max_tokens: tokens ? tokens : LANGUAGE_MODEL_MAX_TOKENS,
        }).catch((error) => console.error('OpenAI Error:\n', error));

        if (response.content[0].text) {
            text = response.content[0].text;
        }
        return text;
    },
};

module.exports = AnthrophicWrapper;
