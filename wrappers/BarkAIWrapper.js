require('dotenv/config');

const {
    BARK_VOICE_MODEL_API_URL,
} = require('../config.json');

const BarkAIWrapper = {
    async generateVoice(text) {
        try {
            const response = await fetch(BARK_VOICE_MODEL_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                })
            });
            if (!response.ok) {
                console.log('Error:', response.status); 
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }
};

module.exports = BarkAIWrapper;
