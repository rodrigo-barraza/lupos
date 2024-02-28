require('dotenv/config');

const {
    LOCAL_URL,
    LOCAL_RESPONSE_TEMPERATURE,
    LOCAL_RESPONSE_MAX_TOKENS
} = require('../config.json');

const LocalAIWrapper = {
    async generateTextResponse(conversation, tokens) {
        const response = await fetch(LOCAL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: conversation,
                temperature: LOCAL_RESPONSE_TEMPERATURE,
                max_tokens: tokens ? tokens : LOCAL_RESPONSE_MAX_TOKENS,
                stream: false
            })
        }).catch(error => console.error('Error:', error));
        return await response.json();
    }
};

module.exports = LocalAIWrapper;
