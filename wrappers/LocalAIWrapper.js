require('dotenv/config');

const {
    LOCAL_TEXT_MODEL_URL,
    LANGUAGE_MODEL_TEMPERATURE,
    LANGUAGE_MODEL_MAX_TOKENS
} = require('../config.json');

const LocalAIWrapper = {
    async generateText(conversation, tokens) {
        let text;
        const response = await fetch(LOCAL_TEXT_MODEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: conversation,
                temperature: LANGUAGE_MODEL_TEMPERATURE,
                max_tokens: tokens ? tokens : LANGUAGE_MODEL_MAX_TOKENS,
                stream: false
            })
        }).catch(error => console.error('Error:', error));
        let responseJson = await response.json();
        if (responseJson.choices[0].message.content) {
            text = responseJson.choices[0].message.content;
        }
        return text;
    }
};

module.exports = LocalAIWrapper;
