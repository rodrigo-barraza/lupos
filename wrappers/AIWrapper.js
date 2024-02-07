require('dotenv/config');
const { OpenAI } = require('openai');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageService = require('../services/MessageService.js');
const { primaryBrainModel, primaryBrainTemperature, primaryBrainMaxTokens, localModelUrl } = require('../config.json');

const openAI = new OpenAI({apiKey: process.env.OPENAI_KEY})

const AIWrapper = {
    async generateResponse(conversation, maxTokens, model = 'gpt-4-0125-preview') {
        if (primaryBrainModel === 'GPT') {
            return response = await openAI.chat.completions.create({
                temperature: primaryBrainTemperature,
                // model: 'gpt-3.5-turbo-0125',
                model: model,
                messages: conversation,
                max_tokens: primaryBrainMaxTokens,
            }).catch((error) => console.error('OpenAI Error:\n', error));
        } else if (primaryBrainModel === 'LOCAL') {
            const response = await fetch(localModelUrl, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                messages: conversation,
                temperature: maxTokens ? maxTokens : primaryBrainTemperature,
                max_tokens: primaryBrainMaxTokens,
                stream: false
                })
            }).catch(error => console.error('Error:', error));
            return await response.json();
        }
    },
    async generateMoodTemperature(message) {
        await message.channel.sendTyping();
        const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
        let conversation = [
            {
                role: 'system',
                content: `
                    ${MessageService.generateBackstoryMessage(message.guild?.id)}
                    ${MessageService.generatePersonalityMessage()}
                    You are an expert at telling if a conversation is positive, neutral or negative, but taking into account how your character would perceive it and react to it. You will only answer with a between from -10 to 10. -10 Being the most negative, 0 being mostly neutral, and 12 being as positive as possible. The number you pick between -10 to 10 will depend on the tone of the conversation, and nothing else. You do not type anything else besides the number that indicates the tone of the conversation. Only a number between -10 to 10, nothing else. You only output a number, an integer, nothing else.
                `
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: message.content,
            }
        ]

        let response = await AIWrapper.generateResponse(conversation, 3, 'gpt-3.5-turbo-0125');
        clearInterval(sendTypingInterval);
        return response.choices[0].message.content;
    },
    // async generateInCharacterResponse(content, message) {
    //     await message.channel.sendTyping();
    //     const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
    //         let conversation = [
    //             {
    //                 role: 'system',
    //                 content: `
    //                     ${MessageService.generateCurrentConversationUser(message)}
    //                     ${MessageService.generateBackstoryMessage(message?.guild?.id)}
    //                     ${MessageService.generatePersonalityMessage()}
    //                     ${MessageService.generateServerSpecificMessage(message?.guild?.id)}
    //                     ${content}
    //                 `
    //             },
    //             {
    //                 role: 'user',
    //                 name: UtilityLibrary.getUsernameNoSpaces(message),
    //                 content: message.content,
    //             }
    //         ]
        
    //         let response = await AIWrapper.generateResponse(conversation, 3);
    //         clearInterval(sendTypingInterval);
    //         return response.choices[0].message.content;
    // },
    async generateInCharacterResponse(systemContent, userContent, interaction) {
        let conversation = [
            {
                role: 'system',
                content: `
                    ${MessageService.generateCurrentConversationUser(interaction)}
                    ${MessageService.generateBackstoryMessage(interaction.guild.id)}
                    ${MessageService.generatePersonalityMessage()}
                    ${MessageService.generateServerSpecificMessage(interaction.guild.id)}
                    ${MessageService.generateKnowledgeMessage(interaction)}
                    ${systemContent}
                `
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(interaction),
                content: userContent,
            }
        ]

        const response = await AIWrapper.generateResponse(conversation, 400, 'gpt-3.5-turbo-0125');
        return response.choices[0].message.content;
    },
};

module.exports = AIWrapper;
