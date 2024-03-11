const moment = require('moment');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageConstant = require('../constants/MessageConstants.js');
const { GUILD_ID_LONEWOLF, GUILD_ID_WHITEMANE, BACKSTORY_MESSAGE, PERSONALITY_MESSAGE, ASSISTANT_MESSAGE } = require('../config.json');

const MessageService = {
    generateCurrentConversationUser(message) {
        const username = UtilityLibrary.discordUsername(message.author || message.member);
        const userMention = UtilityLibrary.discordUserMention(message);
        if (username && userMention) {
            const capitalizedUsername = UtilityLibrary.capitalize(username);
            const roles = UtilityLibrary.discordRoles(message.member);
            let generatedMessage = `## Primary Participant Conversation\n`;
            if (message.guild) {
                generatedMessage += `- You are replying directly to ${capitalizedUsername} with tag ${userMention}.\n`;
                if (roles) {
                    generatedMessage += `- ${capitalizedUsername}'s character traits and roles: ${roles}.\n`;
                }
            }

            generatedMessage += `- Reply by mentioning ${capitalizedUsername}'s tag.\n\n`;
            return generatedMessage;
            
        }
    },
    async generateCurrentConversationUsers(client, message, recentMessages) {
        if (message.guild) {
            let text = `## Secondary Participants Names and their Tags\n\n`;
            text += `There are also other people in the chat, who are not part of your primary conversation, but are still part of the conversation. Here are their names, tags and traits/roles:\n\n`;
            let log = `║ 📣 Participants: `;
            const uniqueUsernames = [];
            const uniqueUserMentions = [];

            recentMessages.forEach((recentMessage) => {
                if (UtilityLibrary.discordUserId(message) === UtilityLibrary.discordUserId(recentMessage)) return;

                const botMention = UtilityLibrary.discordUserMention(client);
                const userMention = UtilityLibrary.discordUserMention(recentMessage);

                let username = UtilityLibrary.discordUsername(recentMessage.author);

                uniqueUsernames.push(username);

                if (recentMessage.author.id &&
                    uniqueUserMentions.indexOf(userMention) === -1 && userMention !== botMention) {
                        let member = message.guild.members.cache.get(recentMessage.author.id);
                        let roles = member ? member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ') : 'No roles';
                        text += `${username} (${userMention}) has these traits and roles: ${roles}\n\n`;
                        log += `${username}(${recentMessage.author.id}) `;
                        uniqueUserMentions.push(userMention);
                }
            })
            if (uniqueUserMentions.length) {
                console.info(log)
                return text;
            }
        }
    },
    generateServerKnowledge(message) {
        let text = '';
        if (message.guild) {
            text += `# Server Information\n`
            text += `- You are in the discord server called ${message.guild.name}, with ${message.guild.memberCount} total members, and ${UtilityLibrary.discordBotsAmount(message)} bots.\n`
            text += `- You are in the channel called: ${message.channel.name}.\n\n`;
        }
        if (message.channel.topic) {
            text += `## Channel Information\n`
            text += `- The channel topic is: ${message.channel.topic}\n\n`
        }
        text += `## How to tag someone\n`
        text += `- To mention, tag or reply to someone, you do it by typing "<@", followed by the tag number associated to them, and finish with ">".\n\n`
        return text;
    },
    generateDateMessage(){
        return `# Date and Time\n- The current date is ${moment().format('MMMM Do YYYY')}, day is ${moment().format('dddd')}, and time is ${moment().format('h:mm A')} in PST.\n\n`;
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
