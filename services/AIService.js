require('dotenv/config');
const AlcoholService = require('../services/AlcoholService.js');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageService = require('../services/MessageService.js');
const MoodService = require('../services/MoodService.js');

const AIService = {
    async generateConversation(message, client) {
        let conversation = [];
        let recentMessages = (await message.channel.messages.fetch({ limit: 12 })).reverse();
    
        conversation.push({
            role: 'system',
            content: `${AlcoholService.generateAlcoholSystemPrompt()}\n
                ${MessageService.generateCurrentConversationUser(message)}\n
                ${MessageService.generateAssistantMessage()}\n
                ${MessageService.generateBackstoryMessage(message.guild?.id)}\n
                ${MessageService.generatePersonalityMessage()}\n
                ${await MoodService.generateMoodMessage(message, client)}\n
                ${MessageService.generateKnowledgeMessage(message)}\n
                ${MessageService.generateCurrentConversationUsers(client, message, recentMessages)}\n
                ${MessageService.generateServerSpecificMessage(message.guild?.id)}\n
            `
        });
    
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
};

module.exports = AIService;
