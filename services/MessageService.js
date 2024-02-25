const moment = require('moment');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageConstant = require('../constants/MessageConstants.js');
const { GUILD_ID_LONEWOLF, GUILD_ID_WHITEMANE, BACKSTORY_MESSAGE, PERSONALITY_MESSAGE, ASSISTANT_MESSAGE } = require('../config.json');

const MessageService = {
    generateCurrentConversationUsers(client, message, recentMessages) {
        if (message.guild) {
            let currentConversationUsers = `💬 Conversation participants: `;
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
                        currentConversationUsers = currentConversationUsers + `${username}(${recentMessage.author.id}) `;
                }
                uniqueUserTags.push(userTag);
            })
            console.log(currentConversationUsers)
            return currentConversationUsers;
        }
    },
    generateCurrentConversationUser(message) {
        const username = message?.author?.displayName || message?.author?.username || message?.user?.globalName || message?.user?.username;
        const userId = message?.author?.id || message?.user?.id;
        if (username && userId) {
            const generatedMessage = `You are in a conversation with, and replying directly to ${UtilityLibrary.capitalize(username)}, but there are other people in the chat. You end your response by mentioning ${UtilityLibrary.capitalize(username)}'s name. Do not do mention their name and tag them at the same time, only one.`;
            if (message.guild) {
                console.log(`📝 Replying in ${message.guild.name}(${message.guild.id}) to ${username}(${userId})`);
            } else {
                console.log(`📝 Replying in a direct message to ${username}(${userId})`)
            }
            return generatedMessage;
        }
    },
    generateKnowledgeMessage(message){
        let generatedMessage = `
            You are in the channel called: ${message.channel.name}.
            The current date is ${moment().format('MMMM Do YYYY')}.
            The current day is ${moment().format('dddd')}.
            When asked the time, you will say, the current time is ${moment().format('h:mm A')}.
            The timezone you are located in is PST.
        `;
        if (message.guild) {
            generatedMessage = generatedMessage +`
                You are in the discord server called ${message.guild.name}.
                You are in a discord server with ${message.guild.memberCount} other members.
                You are in a discord server with ${message.guild.members.cache.filter(member => member.user.bot).size} bots.
            `
        }
        return generatedMessage;
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
        return ASSISTANT_MESSAGE ? ASSISTANT_MESSAGE : MessageConstant.personalityMessage
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
