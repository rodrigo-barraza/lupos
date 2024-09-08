const moment = require('moment');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageConstant = require('../constants/MessageConstants.js');
const { GUILD_ID_LONEWOLF, GUILD_ID_WHITEMANE, BACKSTORY_MESSAGE, PERSONALITY_MESSAGE, ASSISTANT_MESSAGE } = require('../config.json');

const MessageService = {
    assembleCurrentConversationUser(message) {
        const username = UtilityLibrary.discordUsername(message.author || message.member);
        const userMention = UtilityLibrary.discordUserMention(message);
        if (username && userMention) {
            const capitalizedUsername = UtilityLibrary.capitalize(username);
            const roles = UtilityLibrary.discordRoles(message.member);
            let generatedMessage = `# Primary Participant Conversation`;
            if (message.guild) {
                generatedMessage += `\nYou are replying directly to: ${capitalizedUsername}.`;
                generatedMessage += `\n${capitalizedUsername}'s Discord user ID tag: ${userMention}.`;
                if (roles) {
                    generatedMessage += `\n${capitalizedUsername}'s character traits and roles: ${roles}.`;
                }
            }

            generatedMessage += `\nReply by mentioning ${capitalizedUsername}'s tag: ${userMention}.`;
            return generatedMessage;
            
        }
    },
    async assembleCurrentConversationUsers(client, message, recentMessages, usersConversations) {
        let text = `# Secondary Participants that are part of the conversation, but not the primary participant`;
        const allUsers = {};
        if (message.guild) {
            // let log = `║ 📣 Other Participants: `;
            const uniqueUsernames = [];
            const uniqueUserMentions = [];
            let participantsCount = 0;
            recentMessages.forEach((recentMessage) => {
                if (UtilityLibrary.discordUserId(message) === UtilityLibrary.discordUserId(recentMessage)) return;

                const botMention = UtilityLibrary.discordUserMention(client);
                const userMention = UtilityLibrary.discordUserMention(recentMessage);

                let username = UtilityLibrary.discordUsername(recentMessage.author);

                uniqueUsernames.push(username);

                if (recentMessage.author.id &&
                    uniqueUserMentions.indexOf(userMention) === -1 && userMention !== botMention) {
                        console.log(888)
                        participantsCount++;
                        let member = message.guild.members.cache.get(recentMessage.author.id);
                        let roles = member ? member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ') : 'No roles';
                        const user = {
                            id: recentMessage.author.id,
                            username: username,
                            mention: userMention,
                            roles: roles
                        }
                        allUsers[recentMessage.author.id] = user;
                        text += `\n## Participant-${participantsCount}`;
                        text += `\nName: ${username}`;
                        text += `\nDiscord user ID tag: ${userMention}`;
                        text += `\nTraits, roles and descriptions: ${roles}`;
                        text += `\nHas been talking about: ${usersConversations[recentMessage.author.id]}`;
                        // log += `${username}(${recentMessage.author.id}) `;
                        uniqueUserMentions.push(userMention);
                }
            })
        }
        return text;
    },
    assembleServerInformation(message) {
        let text = '';
        if (message.guild) {
            text += `# Server Information`
            text += `\nYou are in the discord server called ${message.guild.name}, with ${message.guild.memberCount} total members, and ${UtilityLibrary.discordBotsAmount(message)} bots.`
            text += `\nYou are in the channel called: ${message.channel.name}.`;
        }
        if (message.channel.topic) {
            text += `\n\n## Channel Information`
            text += `\nThe channel topic is: ${message.channel.topic}`
        }
        text += `\n\n## How to tag someone`
        text += `\nTo mention, tag or reply to someone, you do it by typing "<@", followed by the tag number associated to them, and finish with ">".`
        return text;
    },
    assembleDateMessage(){
        let dateMessage = `# Date and Time`;
        dateMessage += `\nThe current date is ${moment().format('MMMM Do YYYY')}, day is ${moment().format('dddd')}, and time is ${moment().format('h:mm A')} in PST.`;
        return dateMessage;
    },
    assembleServerSpecificMessage(guildId) {
        if (guildId) {
            let generatedMessage = '';
            if (guildId === GUILD_ID_LONEWOLF || guildId === GUILD_ID_WHITEMANE) {
                generatedMessage = MessageConstant.serverSpecificMessageWhitemane
            }
            return generatedMessage;
        }
    },
    assembleAssistantMessage() {
        return ASSISTANT_MESSAGE ? ASSISTANT_MESSAGE : MessageConstant.assistantMessage
    },
    assembleBackstoryMessage(guildId) {
        if (guildId) {
            return BACKSTORY_MESSAGE ? BACKSTORY_MESSAGE : MessageConstant.backstoryMessage
        }
    },
    assemblePersonalityMessage() {
        return PERSONALITY_MESSAGE ? PERSONALITY_MESSAGE : MessageConstant.personalityMessage
    },
};

module.exports = MessageService;
