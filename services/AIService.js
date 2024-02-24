require('dotenv/config');
const AlcoholService = require('../services/AlcoholService.js');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageService = require('../services/MessageService.js');
const MoodService = require('../services/MoodService.js');
const ComfyUILibrary = require('../libraries/ComfyUILibrary.js');
const AIWrapper = require('../wrappers/AIWrapper.js');
const DiscordWrapper = require('../wrappers/DiscordWrapper.js');

const AIService = {
    async generateConversation(message, client) {
        let conversation = [];
        let recentMessages = (await message.channel.messages.fetch({ limit: 12 })).reverse();
    
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
    async generateResponse(message) {
        const client = DiscordWrapper.getClient();
        client.user.setActivity('Generating a Response...', { type: 4 });
        const generatedConversation = await AIService.generateConversation(message, client);
        const generatedResponse = await AIWrapper.generateResponse(generatedConversation);
        return generatedResponse;
    },
    async generateImage(message, text) {
        const client = DiscordWrapper.getClient();
        client.user.setActivity('Writing an Image Prompt...', { type: 4 });
        let imageTextPromptConversation = [
            {
                role: 'system',
                content: `
                    # Primary Purpose: Text-to-Image Prompt
                    // Generate descriptive and visually detailed text-to-image prompts.

                    You will always reply with an text-to-image prompt, and never break this rule.
                    You make prompts based on what is being said to you.
                    Always reference what is being talked, by centering the prompt around it.
                    Do not make references to being helpful, or being a bot, or anything, you simply reply with a prompt to the best of your abilities.
                    You just reply with a prompt, centered around what has been said to you.
                    You are an expert at writing text-to-image prompts, for tools such as stable diffusion, midjourney, and other related platforms. 
                    The prompt will start with: "a beautiful detailed image of a" and it will be very detailed and include everything that you were given.
                    The prompt will end with: "natural lighting, photography".
                    If you are given a subject, place, or any other noun, you will center your prompt around that noun.

                    # Secondary Purposes: Personality, Backstory, Server Specific, Knowledge
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
        let generatedImageTextPrompt = await AIWrapper.generateResponse(imageTextPromptConversation, 240);
        console.log('IMAGE PROMPT: ', generatedImageTextPrompt.choices[0].message.content);
        client.user.setActivity('Painting an Image...', { type: 4 });
        const generatedImage = await ComfyUILibrary.getTheImages(ComfyUILibrary.generateImagePrompt(generatedImageTextPrompt.choices[0].message.content));
        return generatedImage;
    },
    async generateImageFast(text) {
        const client = DiscordWrapper.getClient();
        client.user.setActivity('Painting an Image...', { type: 4 });
        console.log('IMAGE PROMPT: ', text);
        const generatedImage = await ComfyUILibrary.getTheImages(ComfyUILibrary.generateImagePrompt(text));
        return generatedImage;
    },
    async generateAudio(text) {
        const client = DiscordWrapper.getClient();
        client.user.setActivity('Recording Audio...', { type: 4 });
       const generatedAudio = await AIWrapper.generateAudioResponse(text);
       return generatedAudio;
    }
};

module.exports = AIService;
