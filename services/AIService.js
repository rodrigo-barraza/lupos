require('dotenv/config');
const AlcoholService = require('../services/AlcoholService.js');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageService = require('../services/MessageService.js');
const MoodService = require('../services/MoodService.js');
const ComfyUILibrary = require('../libraries/ComfyUILibrary.js');
const DiscordWrapper = require('../wrappers/DiscordWrapper.js');
const OpenAIWrapper = require('../wrappers/OpenAIWrapper.js');
const LocalAIWrapper = require('../wrappers/LocalAIWrapper.js');

const {
    GPT_MOOD_MODEL,
    GPT_MOOD_TEMPERATURE,
    GPT_OR_LOCAL,
    IMAGE_PROMPT_MAX_TOKENS,
    RECENT_MESSAGES_LIMIT
} = require('../config.json');

async function generateText(conversation, tokens, model) {
    let text;
    if (GPT_OR_LOCAL === 'GPT') {
        text = await OpenAIWrapper.generateResponse(conversation, tokens, model);
    } else if (GPT_OR_LOCAL === 'LOCAL') {
        text = await LocalAIWrapper.generateResponse(conversation, tokens, model);
    }
    return text;
}

async function generateImage(text) {
    const image = await ComfyUILibrary.getTheImages(ComfyUILibrary.generateImagePrompt(text));
    return image;
}

const AIService = {
    async generateConversationFromRecentMessages(message, client) {
        let conversation = [];
        let recentMessages = (await message.channel.messages.fetch({ limit: RECENT_MESSAGES_LIMIT })).reverse();
    
        conversation.push({
            role: 'system',
            content: `
                ${MessageService.generateCurrentConversationUser(message)}\n
                ${MessageService.generateAssistantMessage()}\n
                ${MessageService.generateBackstoryMessage(message.guild?.id)}\n
                ${MessageService.generatePersonalityMessage()}\n
                ${MessageService.generateKnowledgeMessage(message)}\n
                ${MessageService.generateCurrentConversationUsers(client, message, recentMessages)}\n
                ${MessageService.generateServerSpecificMessage(message.guild?.id)}\n
            `
        });
    
        // conversation.push({
        //     role: 'system',
        //     content: `
        //         ${AlcoholService.generateAlcoholSystemPrompt()}\n
        //         ${MessageService.generateCurrentConversationUser(message)}\n
        //         ${MessageService.generateAssistantMessage()}\n
        //         ${MessageService.generateBackstoryMessage(message.guild?.id)}\n
        //         ${MessageService.generatePersonalityMessage()}\n
        //         ${await MoodService.generateMoodMessage(message, client)}\n
        //         ${MessageService.generateKnowledgeMessage(message)}\n
        //         ${MessageService.generateCurrentConversationUsers(client, message, recentMessages)}\n
        //         ${MessageService.generateServerSpecificMessage(message.guild?.id)}\n
        //     `
        // });
    
        recentMessages.forEach((msg) => {
            if (msg.author.id === client.user.id) {
                conversation.push({
                    role: 'assistant',
                    name: UtilityLibrary.getUsernameNoSpaces(msg),
                    content: msg.content,
                });
            } else {
                conversation.push({
                    role: 'user',
                    name: UtilityLibrary.getUsernameNoSpaces(msg),
                    content: `${msg.author.displayName ? UtilityLibrary.capitalize(msg.author.displayName) : UtilityLibrary.capitalize(msg.author.username) } said ${msg.content}.`,
                })
            }
        })
    
        console.log(conversation)
        return conversation;
    },
    async generateResponse(message, tokens, model) {
        const client = DiscordWrapper.getClient();
        client.user.setActivity('Generating a Response...', { type: 4 });
        const conversation = await AIService.generateConversationFromRecentMessages(message, client);
        return generateText(conversation, tokens, model);
    },
    async generateResponseFromConversation(conversation, tokens, model) {
        const client = DiscordWrapper.getClient();
        client.user.setActivity('Generating a Response...', { type: 4 });
        return generateText(conversation, tokens, model);
    },
    async generateImage(message, text) {
        const client = DiscordWrapper.getClient();
        client.user.setActivity('Writing an Image Prompt...', { type: 4 });
        let conversation = [
            {
                role: 'system',
                content: `
                    # Primary Purpose: Text-to-Image Prompt
                    // Priority: High
                    // Generate descriptive and visually detailed text-to-image prompts.

                    You will be concise and to the point, and never break this rule.
                    You will always keep messages straight to the point, about 1-3 sentences long, 1 paragraph.
                    You will never go beyond 3 sentences, or 1 paragraphs.
                    You will always reply with an text-to-image prompt, and never break this rule.
                    You make prompts based on what is being said to you.
                    Always reference what is being talked, by centering the prompt around it.
                    Do not make references to being helpful, or being a bot, or anything, you simply reply with a prompt to the best of your abilities.
                    You just reply with a prompt, centered around what has been said to you.
                    You are an expert at writing text-to-image prompts, for tools such as stable diffusion, midjourney, and other related platforms. 
                    The prompt will start with: "a beautiful detailed image of a" and it will be very detailed and include everything that you were given.
                    The prompt will end with: "natural lighting, photography".
                    If you are given a subject, place, or any other noun, you will center your prompt around that noun.


                    ${MessageService.generateBackstoryMessage(message.guild?.id)}\n
                    ${MessageService.generateServerSpecificMessage(message.guild?.id)}\n
                `
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: `Make a prompt based on this: ${text ? text : message.content}`,
            }
        ]
        let response = await AIService.generateResponseFromConversation(conversation, IMAGE_PROMPT_MAX_TOKENS);
        const responseContentText = response.choices[0].message.content;
        console.log('IMAGE PROMPT: ', responseContentText);
        client.user.setActivity('Painting an Image...', { type: 4 });
        return await generateImage(responseContentText);
    },
    async generateImageRaw(text) {
        const client = DiscordWrapper.getClient();
        client.user.setActivity('Painting an Image...', { type: 4 });
        console.log('IMAGE PROMPT: ', text);
        return await generateImage(text);
    },
    async generateAudio(text) {
        const client = DiscordWrapper.getClient();
        client.user.setActivity('Recording Audio...', { type: 4 });
        return await OpenAIWrapper.generateAudioResponse(text);
    },
    async generateResponseIsolated(systemContent, userContent, interaction) {
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

        const response = await AIService.generateResponse(conversation);
        return response.choices[0].message.content;
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

        let response = await AIService.generateResponse(conversation, GPT_MOOD_TEMPERATURE, GPT_MOOD_MODEL);
        clearInterval(sendTypingInterval);
        return response.choices[0].message.content;
    }
};

module.exports = AIService;
