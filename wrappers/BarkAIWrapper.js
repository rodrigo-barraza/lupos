require('dotenv/config');

const {
    LOCAL_URL,
    LOCAL_RESPONSE_TEMPERATURE,
    LOCAL_RESPONSE_MAX_TOKENS
} = require('../config.json');

const BarkAIWrapper = {
    async generateAudio(text) {
        const response = await fetch('http://localhost:5000/audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
            })
        }).catch(error => console.error('Error:', error));
        return await response.json();
    }
};

module.exports = BarkAIWrapper;
