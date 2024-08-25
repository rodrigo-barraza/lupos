const moment = require('moment');
const luxon = require('luxon');

const colors = [
    'black',
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
    'white',
    'gray',
    'pink',
    'teal',
    'canary',
    'azure',
    'fuchsia',
    'aqua',
    'snow',
]

const UtilityLibrary = {
    async isImageUrl(url) {
        try {
            const response = await fetch(url);
            const contentType = response.headers.get('content-type');
            return contentType.startsWith('image/');
        } catch (error) {
            console.error('Error checking if URL is an image:', error);
            return false;
        }
    },
    // Date Utilities
    getCurrentDateAndTime(date) {
        return moment(date).format('YYYY-MM-DD HH:mm:ss');
    },
    getMinutesAgo(date) {
        return moment(date).fromNow();  
    },
    consoleInfo(messages) {
        const colorCodes = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']; // Define more as needed
        const resetStyle = "\x1b[0m";

        // print current time as 1:23:45PM
        const currentTime = luxon.DateTime.now().toFormat('h:mm:ss a');
        
        const formattedMessages = messages.map(([message, { bold, faint, italic, underline, slowBlink, rapidBlink, crossedOut, doubleUnderline, superscript, subscript, color } = {}]) => {
            const colorIndex = color && colorCodes.includes(color.toLowerCase()) ? colorCodes.indexOf(color.toLowerCase()) + 30 : '';
            const colorCode = color ? `;${colorIndex}` : '';
            const styleCodes = [
                bold ? '1' : '',
                faint ? '2' : '',
                italic ? '3' : '',
                underline ? '4' : '',
                slowBlink ? '5' : '',
                rapidBlink ? '6' : '',
                crossedOut ? '9' : '',
                doubleUnderline ? '21' : '',
                superscript ? '73' : '',
                subscript ? '74' : '',
            ].filter(code => code).join(';');
            const style = `\x1b[${styleCodes}${colorCode}m`;
    
            if (typeof message === 'object') {
                return [style, message, resetStyle];
            } else {
                return `${currentTime} - ${style}${message}${resetStyle}`;
            }
        });
    
        console.info(...formattedMessages.flat());
    },
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
    areArraysEqual(array1, array2) {
        return array1.length === array2.length &&
        array1.every(item1 =>
            array2.some(item2 =>
            Object.keys(item1).length === Object.keys(item2).length &&
            Object.entries(item1).every(([key, val]) => item2.hasOwnProperty(key) && item2[key] === val)
            )
        ) &&
        array2.every(item1 =>
            array1.some(item2 =>
            Object.keys(item1).length === Object.keys(item2).length &&
            Object.entries(item1).every(([key, val]) => item2.hasOwnProperty(key) && item2[key] === val)
            )
        );
    },
    // Discord Utilities
    findUserById(client, userId) {
        const user = client.users.cache.get(userId)
        return UtilityLibrary.discordUsername(user)
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
