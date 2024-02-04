const UtilityLibrary = require('../libraries/UtilityLibrary.js');

let hungerChannelId = '1198326193984913470';
let guildId = '1004528256072044705'; // the clam

const OpenAIWrapper = {
    async generateMoodTemperature(message, openai) {
        await message.channel.sendTyping();
        const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
        let conversationTemperature = [
            {
                role: 'system',
                content: 'You are an expert at telling if a conversation is positive, neutral or negative. You will only answer with a between from -10 to 10. -10 Being the most negative, 0 being mostly neutral, and 12 being as positive as possible. The number you pick between -10 to 10 will depend on the tone of the conversation, and nothing else. You do not type anything else besides the number that indicates the tone of the conversation. Only a number between -10 to 10, nothing else. You only output a number, an integer, nothing else.'
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: message.content,
            }
        ]
    
        const temperatureResponse = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: conversationTemperature,
            temperature: 1,
        }).catch((error) => console.error('OpenAI Error:\n', error));

        clearInterval(sendTypingInterval);
        return temperatureResponse.choices[0].message.content;
    },
    async generateResponse(roleContent, message, openai) {
        await message.channel.sendTyping();
        const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
        let conversation = [
            {
                role: 'system',
                content: roleContent
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: message.content,
            }
        ]
    
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: conversation,
            temperature: 1,
        }).catch((error) => console.error('OpenAI Error:\n', error));

        clearInterval(sendTypingInterval);
        return response.choices[0].message.content;
    },
    async generateInCharacterResponse(content, message, openai) {
        await message.channel.sendTyping();
        const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
            let conversation = [
                {
                    role: 'system',
                    content: `
                        ${content}
                        ${UtilityLibrary.generateCurrentConversationUser(message)}
                        ${UtilityLibrary.generateBackstoryMessage(message.guild.id)}
                        ${UtilityLibrary.generatePersonalityMessage()}
                        ${UtilityLibrary.generateServerSpecificMessage(message.guild.id)}
                    `
                },
                {
                    role: 'user',
                    name: UtilityLibrary.getUsernameNoSpaces(message),
                    content: message.content,
                }
            ]
        
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: conversation,
                temperature: 1,
            }).catch((error) => console.error('OpenAI Error:\n', error));
    
            clearInterval(sendTypingInterval);
            return response.choices[0].message.content;
    },
    async generateInCharacterResponseSpecial(client, systemContent, userContent, openai) {
        client.channels.cache.get(hungerChannelId).sendTyping();
        const sendTypingInterval = setInterval(() => { client.channels.cache.get(hungerChannelId).sendTyping() }, 5000);
        // const message = client.channels.cache.get(hungerChannelId).messages.cache.last();
        let conversation = [
            {
                role: 'system',
                content: systemContent
            },
            {
                role: 'user',
                name: 'self',
                content: `
                ${userContent}
                ${UtilityLibrary.generateBackstoryMessage(guildId)}
                ${UtilityLibrary.generatePersonalityMessage()}
                ${UtilityLibrary.generateServerSpecificMessage(guildId)}`,
            }
        ]
    
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-1106',
            messages: conversation,
            temperature: 1,
        }).catch((error) => console.error('OpenAI Error:\n', error));

        clearInterval(sendTypingInterval);
        return response.choices[0].message.content;
    }
};

module.exports = OpenAIWrapper;
