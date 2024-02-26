const moment = require('moment');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageConstant = require('../constants/MessageConstants.js');
const { GUILD_ID_LONEWOLF, GUILD_ID_WHITEMANE, BACKSTORY_MESSAGE, PERSONALITY_MESSAGE, ASSISTANT_MESSAGE } = require('../config.json');

const MessageService = {
    generateCurrentConversationUsers(client, message, recentMessages) {
        if (message.guild) {
            let text = `\n# Conversation participant usernames, and ids\n\n`;
            let currentConversationUsers = `💬 Conversation participant usernames and their respective id: `;
            const uniqueUsernames = [];
            const uniqueUserTags = [];


            recentMessages.forEach((recentMessage) => {
                let username = '';
                let userTag = '';

                if (recentMessage.author.displayName && uniqueUsernames.indexOf(recentMessage.author.displayName) === -1) {
                    username = recentMessage.author.displayName;
                } else if (!recentMessage.author.displayName) {
                    username = recentMessage.author.username;
                }

                uniqueUsernames.push(username);

                if (recentMessage.author.id &&
                    uniqueUserTags.indexOf(`<@${recentMessage.author.id}>`) === -1 &&
                    `<@${recentMessage.author.id}>` !== `<@${client.user.id}>`) {
                        userTag = `<@${recentMessage.author.id}>`;
                        text += `${username}, ${recentMessage.author.id}\n`;
                        currentConversationUsers = currentConversationUsers + `${username}(${recentMessage.author.id}) `;
                }
                uniqueUserTags.push(userTag);
            })
            console.log(currentConversationUsers)
            return text;
        }
    },
    generateCurrentConversationUser(message) {
        const username = message?.author?.displayName || message?.author?.username || message?.user?.globalName || message?.user?.username;
        const userId = message?.author?.id || message?.user?.id;
        if (username && userId) {
            let generatedMessage = `\n# Current conversation\n\n`;
            if (message.guild) {
                generatedMessage += `You are in a conversation with, and replying directly to ${UtilityLibrary.capitalize(username)}, but there are other people in the chat.\n`;
            } else {
                console.log(`📝 Replying in a direct message to ${username}(${userId})`)
            }
            generatedMessage += `You end your response by mentioning ${UtilityLibrary.capitalize(username)}'s name.\nDo not do mention  ${UtilityLibrary.capitalize(username)}'s and tag them at the same time, only one.\n`;
                console.log(`📝 Replying in ${message.guild.name}'s ${message.channel.name} to ${username}(${userId})`);
            return generatedMessage;
            
        }
    },
    generateServerKnowledge(message) {
        if (message.guild) {
            return `# Discord server knowledge\n\nYou are in the discord server called ${message.guild.name}, with ${message.guild.memberCount} other members, and ${message.guild.members.cache.filter(member => member.user.bot).size} bots.\nYou are in the channel called: ${message.channel.name}.`
        }
    },
    generateKnowledgeMessage(message){
        return `
        # The current date and time
        
        The current date is ${moment().format('MMMM Do YYYY')}, day is ${moment().format('dddd')}, and time is ${moment().format('h:mm A')} in PST.`;
    },
    generateServerSpecificMessage(guildId) {
        if (guildId) {
            let generatedMessage = '';
            if (guildId === GUILD_ID_LONEWOLF || guildId === GUILD_ID_WHITEMANE) {
                generatedMessage = MessageConstant.serverSpecificMessageWhitemane
            }
            return generatedMessage;
        }
    },
    generateAssistantMessage() {
        return ASSISTANT_MESSAGE ? ASSISTANT_MESSAGE : MessageConstant.assistantMessage
    },
    generateBackstoryMessage(guildId) {
        if (guildId) {
            return BACKSTORY_MESSAGE ? BACKSTORY_MESSAGE : MessageConstant.backstoryMessage
        }
    },
    generatePersonalityMessage() {
        return PERSONALITY_MESSAGE ? PERSONALITY_MESSAGE : MessageConstant.personalityMessage
    },
};

module.exports = MessageService;
