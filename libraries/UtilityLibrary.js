const UtilityLibrary = {
    capitalize(string) {
        if (string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
    },
    getUsernameNoSpaces(message) {
        let name = message?.author?.displayName || message?.author?.username || message?.user?.username;
        let username = 'default';
        if (name) {
            username = name ? name.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '') : message?.author?.username || message?.user?.username;
            if (!username) {
                username = message?.author?.username || message?.user?.username || 'default';
            }
        }
        return username;
    },
    howl() {
        let howl = 'Aw';
        let randomize = Math.floor(Math.random() * 10) + 1;
        for (let i = 0; i < randomize; i++) {
            howl = howl + 'o';
        }
        howl = howl + '!';
        return howl;
    },
    discordBotsAmount(message) {
        if (message) {
            const bots = message.guild.members.cache.filter(member => member.user.bot).size;
            return bots;
        }
    },
    discordRoles(member) {
        if (member) {
            let roles = member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ');
            return roles;
        }
    },
    discordUsername(authorOrUser) {
        if (authorOrUser) {
            const username = authorOrUser.displayName || authorOrUser.username || authorOrUser.globalName;
            return username;
        }
    },
    discordUserId(message) {
        if (message) {
            const userId = message?.author?.id || message?.user?.id;
            return userId;
        }
    },
    discordUserMention(message) {
        if (message) {
            const userId = message?.author?.id || message?.user?.id;
            return `<@${userId}>`;
        }
    },
    discordUserTag(item) {
        if (item) {
            const userTag = item?.author?.tag || item?.user?.tag;
            return userTag;
        }
    },
    discordGetMember(message) {
        if (message) {
            const userId = message?.author?.id || message?.user?.id;
            const member = message.guild.members.cache.get(userId);
            return member;
        }
    },
    detectHowlAndRespond(message) {
        if (message.content.toLowerCase().includes('!howl')) {
            const howl = UtilityLibrary.howl(message);
            message.channel.send(howl);
        }
    },
    async detectMessageAndReact(message) {
        if (message.author.id !== message.client.user.id && (message.content.toLowerCase().includes('lupos') || message.content.toLowerCase().includes('good dog') || message.content.toLowerCase().includes('good boy'))) {
            try {
                await message.react('1194383720946352200');
            } catch (error) {
                // console.error('One of the emojis failed to react.');
                // Usually because someone has blocked the bot, so the bot cannot react.
            }
        }
    }
};

module.exports = UtilityLibrary;
