const moment = require('moment');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageConstant = require('../constants/MessageConstants.js');
const { GUILD_ID_LONEWOLF, GUILD_ID_WHITEMANE, BACKSTORY_MESSAGE, PERSONALITY_MESSAGE, ASSISTANT_MESSAGE } = require('../config.json');
const DiscordWrapper = require('../wrappers/DiscordWrapper.js');

// async function generateUsersSummary(client, message, recent100Messages) {
//     const uniqueUsers = Array.from(new Map(recent100Messages.map(msg => [msg?.author?.id || msg?.user?.id, msg])).values());

//     const arrayOfUsers = uniqueUsers.map((user) => {
//         if (user.author.id === client.user.id || user.author.id === message.author.id) return;
//         const userMessages = recent100Messages.filter(msg => msg.author.id === user.author.id);
//         const userMessagesAsText = userMessages.map(msg => msg.content).join('\n\n');
//         let customConversation = [
//             {
//                 role: 'system',
//                 content: `
//                     You are an expert at giving detailed summaries of what is said to you.
//                     You will go through the messages that are sent to you, and give a detailed summary of what is said to you.
//                     You will describe the messages that are sent to you as detailed and creative as possible.
//                     The messages that are sent are what ${DiscordWrapper.getNameFromItem(user)} has been talking about.
//                 `
//             },
//             {
//                 role: 'user',
//                 name: UtilityLibrary.getUsernameNoSpaces(message),
//                 content: ` Here are the last recent messages by ${DiscordWrapper.getNameFromItem(user)} in this channel, and is what they have been talking about:
//                 ${userMessagesAsText}`,
//             }
//         ];
//         return AIService.generateResponseFromCustomConversation(customConversation, 360, GPT_MOOD_MODEL);
//     }).filter(Boolean);

//     const allMessages = await Promise.allSettled(arrayOfUsers);
//     let generateCurrentConversationUsersSummary = '## Secondary Participants Conversations\n\n';
//     // generateCurrentConversationUsersSummary += '// These people are also in the chat,
//     allMessages.forEach((result) => {
//         if (result.status === 'fulfilled') {
//             generateCurrentConversationUsersSummary += result.value.choices[0]?.message.content + `\n\n`;
//         }
//     });
//     return generateCurrentConversationUsersSummary;
// }

const MessageService = {
    async generateCurrentConversationUsers(client, message, recentMessages) {
        if (message.guild) {
            let text = `## Secondary Participants Names and their Ids\n\n`;
            text += `There are also other people in the chat, who are not part of your primary conversation, but are still part of the conversation. Here are their names, ids and traits/roles:\n\n`;
            let currentConversationUsers = `💬 Conversation participant usernames and their respective ids: `;
            const uniqueUsernames = [];
            const uniqueUserTags = [];


            recentMessages.forEach((recentMessage) => {
                if (message.author.id === recentMessage.author.id) return;
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
                        let member = message.guild.members.cache.get(recentMessage.author.id);
                        let roles = member ? member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ') : 'No roles';
                        userTag = `<@${recentMessage.author.id}>`;
                        text += `${username} (${recentMessage.author.id}) has these traits and roles: ${roles}\n\n`;
                        currentConversationUsers += `${username}(${recentMessage.author.id}).`;
                }
                uniqueUserTags.push(userTag);
            })
            console.log(currentConversationUsers)
            // text += await generateUsersSummary(client, message, recentMessages);
            return text;
        }
    },
    generateCurrentConversationUser(message) {
        const username = message?.author?.displayName || message?.author?.username || message?.user?.globalName || message?.user?.username;
        const userId = message?.author?.id || message?.user?.id;
        if (username && userId) {
            let generatedMessage = `## Primary Participant Conversation\n\n`;
            if (message.guild) {
                generatedMessage += `You are replying directly to ${UtilityLibrary.capitalize(username)} with id ${userId}.\n`;
                generatedMessage += `This is part of their character trait and roles: ${message.member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ')}.\n`;
                console.log(`📝 Replying in ${message.guild.name}'s ${message.channel.name} to ${username}(${userId})`);
            } else {
                console.log(`📝 Replying in a direct message to ${username}(${userId})`)
            }
            
            generatedMessage += `You end your response by mentioning ${UtilityLibrary.capitalize(username)}'s name.\nDo not do mention ${UtilityLibrary.capitalize(username)}'s and tag them at the same time, only one.\n`;
            return generatedMessage;
            
        }
    },
    generateServerKnowledge(message) {
        let text = '';
        if (message.guild) {
            text += `# Server Information\n\nYou are in the discord server called ${message.guild.name}, with ${message.guild.memberCount} total members, and ${message.guild.members.cache.filter(member => member.user.bot).size} bots.\nYou are in the channel called: ${message.channel.name}.\n\n`;
        }
        if (message.channel.topic) {
            text += `The channel topic is: ${message.channel.topic}\n\n`
        }
        text += `## How to tag someone\n\nTo mention, tag or reply to someone, you do it by typing "<@", followed by the tag number associated to them, and finish with ">".\n\n`
        return text;
    },
    generateDateMessage(message){
        return `# Date and Time\n\nThe current date is ${moment().format('MMMM Do YYYY')}, day is ${moment().format('dddd')}, and time is ${moment().format('h:mm A')} in PST.\n`;
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
