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
    formatId(item) {
        return `@<${item.user.id}>`;
    },
    discordRoles(message) {
        let roles = message.member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ');
        return roles;
    },
    discordUsername(message) {
        const username = message?.author?.displayName || message?.author?.username || message?.user?.globalName || message?.user?.username;
        return username;
    },
    discordUserId(message) {
        const userId = message?.author?.id || message?.user?.id;
        return userId;
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
