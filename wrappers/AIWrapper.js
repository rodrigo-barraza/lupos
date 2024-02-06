require('dotenv/config');
const { OpenAI } = require('openai');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageService = require('../services/MessageService.js');
const { primaryBrainModel, primaryBrainTemperature, primaryBrainMaxTokens, localModelUrl } = require('../config.json');

let hungerChannelId = '1198326193984913470';
let guildId = '1004528256072044705'; // the clam

const open_ai = new OpenAI({apiKey: process.env.OPENAI_KEY})

const AIWrapper = {
    async generateResponse(conversation) {
        if (primaryBrainModel === 'GPT') {
            return response = await open_ai.chat.completions.create({
                temperature: primaryBrainTemperature,
                model: 'gpt-3.5-turbo-1106',
                // model: 'gpt-4-1106-preview',
                messages: conversation,
            }).catch((error) => console.error('OpenAI Error:\n', error));
        } else if (primaryBrainModel === 'LOCAL') {
            return response = await fetch(localModelUrl, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                messages: conversation,
                temperature: primaryBrainTemperature,
                max_tokens: primaryBrainMaxTokens,
                stream: false
                })
            }).catch(error => console.error('Error:', error));
        }
    },
    async generateMoodTemperature(message) {
        await message.channel.sendTyping();
        const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
        let conversationTemperature = [
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

        let temperatureResponse = await AIWrapper.generateResponse(conversationTemperature);
        clearInterval(sendTypingInterval);
        return temperatureResponse.choices[0].message.content;
    },
    // async generateResponse(roleContent, message, openai) {
    //     // await message.channel.sendTyping();
    //     const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
    //     let conversation = [
    //         {
    //             role: 'system',
    //             content: roleContent
    //         },
    //         {
    //             role: 'user',
    //             name: UtilityLibrary.getUsernameNoSpaces(message),
    //             content: message.content,
    //         }
    //     ]
    
    //     const response = await openai.chat.completions.create({
    //         model: 'gpt-3.5-turbo',
    //         messages: conversation,
    //         temperature: 1,
    //     }).catch((error) => console.error('OpenAI Error:\n', error));

    //     clearInterval(sendTypingInterval);
    //     return response.choices[0].message.content;
    // },
    async generateInCharacterResponse(content, message) {
        await message.channel.sendTyping();
        const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
            let conversation = [
                {
                    role: 'system',
                    content: `
                        ${MessageService.generateCurrentConversationUser(message)}
                        ${MessageService.generateBackstoryMessage(message?.guild?.id)}
                        ${MessageService.generatePersonalityMessage()}
                        ${MessageService.generateServerSpecificMessage(message?.guild?.id)}
                        ${content}
                    `
                },
                {
                    role: 'user',
                    name: UtilityLibrary.getUsernameNoSpaces(message),
                    content: message.content,
                }
            ]
        
            const response = await open_ai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: conversation,
                temperature: 1,
            }).catch((error) => console.error('OpenAI Error:\n', error));
    
            clearInterval(sendTypingInterval);
            return response.choices[0].message.content;
    },
    async generateInCharacterResponse2(systemContent, userContent, interaction) {
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

        const response = await AIWrapper.generateResponse(conversation);
        return response.choices[0].message.content;
    },
    // async generateInCharacterResponseSpecial(client, systemContent, userContent, openai) {
    //     client.channels.cache.get(hungerChannelId).sendTyping();
    //     const sendTypingInterval = setInterval(() => { client.channels.cache.get(hungerChannelId).sendTyping() }, 5000);
    //     // const message = client.channels.cache.get(hungerChannelId).messages.cache.last();
    //     let conversation = [
    //         {
    //             role: 'system',
    //             content: systemContent
    //         },
    //         {
    //             role: 'user',
    //             name: 'self',
    //             content: `
    //             ${userContent}
    //             ${UtilityLibrary.generateBackstoryMessage(guildId)}
    //             ${UtilityLibrary.generatePersonalityMessage()}
    //             ${UtilityLibrary.generateServerSpecificMessage(guildId)}`,
    //         }
    //     ]
    
    //     const response = await openai.chat.completions.create({
    //         model: 'gpt-3.5-turbo-1106',
    //         messages: conversation,
    //         temperature: 1,
    //     }).catch((error) => console.error('OpenAI Error:\n', error));

    //     clearInterval(sendTypingInterval);
    //     return response.choices[0].message.content;
    // }
};

module.exports = AIWrapper;