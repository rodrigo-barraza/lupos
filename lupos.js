process.noDeprecation = true
require('dotenv/config');
const {
    WHITEMANE_YAPPER_ROLE_ID,
    WHITEMANE_OVERREACTOR_ROLE_ID,
    WHITEMANE_POLITICS_CHANNEL_ID,
    WHITEMANE_GENERAL_CHANNEL_ID,
    WHITEMANE_FITEMANE_CHANNEL_ID,
    GUILD_ID_WHITEMANE,
    GENERATE_IMAGE,
    GENERATE_VOICE,
    BLABBERMOUTH,
    DETECT_AND_REACT,
    DISCORD_TOKEN,
    BARK_VOICE_FOLDER,
} = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const { Collection, Events, ChannelType } = require('discord.js');
const UtilityLibrary = require('./libraries/UtilityLibrary.js');
const AlcoholService = require('./services/AlcoholService.js');
const MoodService = require('./services/MoodService.js');
const DiscordWrapper = require('./wrappers/DiscordWrapper.js');
const AIService = require('./services/AIService.js');
const YapperService = require('./services/YapperService.js');
const luxon = require('luxon');

const client = DiscordWrapper.instantiate();

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
// D:\develop\chatter is one level up from here
// const chatterPath = path.join(__dirname, '../chatter');
const chatterPath = '\\\\wsl.localhost\\Ubuntu\\home\\rodrigo\\chatter';

let lastMessageSentTime = luxon.DateTime.now().toISO()
let isResponding = false

    
function findUserById(id) {
    const user = client.users.cache.get(id);
    return UtilityLibrary.discordUsername(user);
}

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

async function findOverreactors(combinedMessages, guild) {
    const userIds = [];
    let mostCommonOverreactorId;
  
    try {
        const results = await Promise.all(
            combinedMessages.map(message => 
            Promise.all(
                Array.from(message.reactions.cache.values()).map(reaction => 
                reaction.users.fetch()
                )
            )
            )
        );
    
        results.forEach(reactions => {
            reactions.forEach(users => {
            users.forEach(user => {
                const existingUser = userIds.find(u => u.id === user.id);
                if (existingUser) {
                existingUser.count++;
                } else {
                userIds.push({ id: user.id, count: 1 });
                }
            });
            });
        });
        
        const overreactorRoleId = WHITEMANE_OVERREACTOR_ROLE_ID;
        mostCommonOverreactorId = userIds.reduce((acc, user) => (user.count > acc.count ? user : acc), userIds[0]).id;
        mostCommonOverreactorCount = userIds.reduce((acc, user) => (user.count > acc.count ? user : acc), userIds[0]).count;

        if (mostCommonOverreactorCount > 4) {
            const overreactorRole = guild.roles.cache.find(role => role.id === overreactorRoleId);
    
            const currentOverreactor = await guild.members.fetch(mostCommonOverreactorId);
    
            const membersWithRole = guild.members.cache.filter(member => member.roles.cache.some(role => role.id === overreactorRoleId));
            if (previousOverreactorId !== currentOverreactor.id) {
                await membersWithRole.forEach(member => member.roles.remove(overreactorRole));
                currentOverreactor.roles.add(overreactorRole);
                previousOverreactorId = currentOverreactor.id;
                UtilityLibrary.consoleInfo([[`🤯 ${currentOverreactor.displayName} has been given the role ${overreactorRole.name}`, { color: 'red' }]]);
            }
        } else {
            const overreactorRole = guild.roles.cache.find(role => role.id === overreactorRoleId);
            const membersWithRole = guild.members.cache.filter(member => member.roles.cache.some(role => role.id === overreactorRoleId));
            await membersWithRole.forEach(member => member.roles.remove(overreactorRole));
        }
    } catch (err) {
      console.error('Error in processing:', err);
    }
  }

const IGNORE_PREFIX = "!";

let previousBlabberMouthId;

let previousOverreactorId;

async function blabberMouth(client) {
    const channel1 = client.channels.cache.get(WHITEMANE_POLITICS_CHANNEL_ID);
    const channel2 = client.channels.cache.get(WHITEMANE_GENERAL_CHANNEL_ID);
    const channel3 = client.channels.cache.get(WHITEMANE_FITEMANE_CHANNEL_ID);
    const guild = client.guilds.cache.get(GUILD_ID_WHITEMANE);
    const yapperRoleId = WHITEMANE_YAPPER_ROLE_ID;

    const allMessages = await Promise.all([
        channel1.messages.fetch({ limit: 100 }),
        // channel2.messages.fetch({ limit: 10}),
        // channel3.messages.fetch({ limit: 15 }),
    ]);
    
    // const combinedMessages = allMessages[0].concat(allMessages[1], allMessages[2]);
    
    const combinedMessages = allMessages[0]

    const last100Recent = [...combinedMessages]
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    .slice(0, 100);



    // find the most common author.id in messages array
    const authorCounts = combinedMessages.reduce((counts, message) => {
        if (Object.keys(counts).length < 100) {
            const authorId = message.author.id;
            if (!counts[authorId]) {
                counts[authorId] = { count: 0, earliestTimestamp: message.createdTimestamp };
            }
            counts[authorId].count++;
            counts[authorId].earliestTimestamp = Math.min(counts[authorId].earliestTimestamp, message.createdTimestamp);
        }
        return counts;
    }, {});
    
    const first100Authors = Object.entries(authorCounts)
        .sort((a, b) => a[1].earliestTimestamp - b[1].earliestTimestamp)
        .slice(0, 100)
        .reduce((acc, [authorId, { count }]) => {
            acc[authorId] = count;
            return acc;
        }, {});

    const mostCommonAuthorId = Object.keys(first100Authors).reduce((a, b) => first100Authors[a] > first100Authors[b] ? a : b);

    await findOverreactors(combinedMessages, guild);
    
    const yapperRole = guild.roles.cache.find(role => role.id === yapperRoleId);
    const currentBlabbermouth = await guild.members.fetch(mostCommonAuthorId);
    const membersWithRole = guild.members.cache.filter(member => member.roles.cache.some(role => role.id === yapperRoleId));

    if (previousBlabberMouthId !== currentBlabbermouth.id) {
        await membersWithRole.forEach(member => member.roles.remove(yapperRole));
        currentBlabbermouth.roles.add(yapperRole);
        previousBlabberMouthId = currentBlabbermouth.id;
        UtilityLibrary.consoleInfo([[`🤌 ${currentBlabbermouth.displayName} has been given the role ${yapperRole.name}`, { color: 'red' }]]);
    }

    // find top 5 common authors
    const sortedAuthors = Object.entries(first100Authors).sort((a, b) => b[1] - a[1]);
    const yappers = sortedAuthors.slice(0, 5);

    const oldYappers = YapperService.getYappers();

    const areArraysEqual = (array1, array2) =>
        array1.length === array2.length &&
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

    function mapYappers(yappers) {
        const yappersMap = yappers.reduce((acc, [id, posts]) => {
            const member = guild.members.cache.get(id);
            const displayName = member ? member.displayName : 'Unknown';
            if (acc[id]) {
                acc[id].posts += posts;
            } else {
                acc[id] = { id, posts, displayName };
            }
            return acc;
        }, {});
        return Object.values(yappersMap);
    }

    const mappedYappers = mapYappers(yappers);

    if (!areArraysEqual(oldYappers, mappedYappers)) {
        YapperService.setYappers(mappedYappers);
        // console.log('🗣 Current yappers:', mappedYappers);
    }
}

function displayAllGuilds() {
    const guildArray = []
    client.guilds.cache.forEach(guild => {
        // connectedGuildsText += `${guild.name}(${guild.id}) `;
        guildArray.push(guild);
    });
    let connectedGuildsText = `🌎 Connected Guilds (Servers): ${guildArray.length }`
    UtilityLibrary.consoleInfo([[connectedGuildsText, {}]]);
}


UtilityLibrary.consoleInfo([[`---`, { bold: true, color: 'green' }]]);
UtilityLibrary.consoleInfo([[`🤖 Lupos v1.0 starting`, { bold: true, color: 'red' }]]);

client.on("ready", () => {
    UtilityLibrary.consoleInfo([[`👌 Logged in as ${client.user.tag}`, { bold: true }]]);
    AlcoholService.instantiate();
    MoodService.instantiate();
    displayAllGuilds()
    if (BLABBERMOUTH) {
        blabberMouth(client)
        setInterval(() => {
            blabberMouth(client)
        }, 10 * 1000);
    }
  }
);

let processingMessageQueue = false;
const queue = []
    
async function messageQueue() {
    if (processingMessageQueue || queue.length === 0) {
        console.log('empty queue')
        return;
    }
    processingMessageQueue = true;
    while (queue.length > 0) {
        const message = queue.shift();
        await message.channel.sendTyping();
        const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);

        const userMention = UtilityLibrary.discordUserMention(message);
        const username = UtilityLibrary.discordUsername(message.author || message.member);
        const discordUserTag = UtilityLibrary.discordUserTag(message);
        
        let timer = 0;

        const timerInterval = setInterval(() => {
            timer++;
        }, 1000);
        
        UtilityLibrary.consoleInfo([[`╔═══════════════░▒▓ +MESSAGE+ ▓▒░══════════════════╗`, { color: 'yellow' }]]);
        UtilityLibrary.consoleInfo([[`║ 💬 Replying to: ${discordUserTag}`, { color: 'cyan' }]]);
        if (message.guild) {
            UtilityLibrary.consoleInfo([[`║ 🌐 Server: ${message.guild.name}`, { color: 'white' }]]);
            UtilityLibrary.consoleInfo([[`║ 📡 Channel: #${message.channel.name}`, { color: 'white' }]]);
        }

        // if text contains the word draw, generate text and image at the same time
        
        const draw = ['draw', 'sketch', 'paint', 'image', 'make', 'redo'].some(substring => message.content.toLowerCase().includes(substring));
        

        let imageToGenerate = message.content;

        if (message.content.match(/<@!?\d+>/g)) {
            const userIds = message.content.match(/<@!?\d+>/g).map(user => user.replace(/<@!?/, '').replace('>', ''));
            for (const userId of userIds) {
                if(userId === client.user.id) continue;
                const user = client.users.cache.get(userId);
                if (user) {
                    const avatar_url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg`
                    const eyes = await AIService.generateVision(avatar_url, 'Describe this image');
                    let member = message.guild.members.cache.get(user.id);
                    let roles = member ? member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ') : 'No roles';
                    const imageDescription = `${UtilityLibrary.discordUsername(user)} (${eyes.choices[0].message.content} ${roles}.)`;
                    const textDescription = `<@${userId}> ([Username]: ${UtilityLibrary.discordUsername(user)}, [Description]: ${eyes.choices[0].message.content} [Roles]: ${roles}.)`;
                    imageToGenerate = imageToGenerate.replace(`<@${userId}>`, imageDescription);
                    message.content = message.content.replace(`<@${userId}>`, textDescription);
                }
            }
        }

        if (draw && GENERATE_IMAGE) {
            // generatedImage = await AIService.generateImage(message, responseMessage)
            // generatedResponse = await AIService.generateText({message});
            const finalResults = await Promise.all([
                AIService.generateText({message}),
                AIService.generateImage(message, imageToGenerate)
            ]);
            const generatedResponse = finalResults[0];
            const generatedImage = finalResults[1];
        
            let responseMessage = `${generatedResponse.replace(new RegExp(`<@${client.user.id}>`, 'g'), '').replace(new RegExp(`@${client.user.tag}`, 'g'), '')}`;
    
            // replace @here and @everyone with here and everyone
            responseMessage = responseMessage
                                .replace(/@here/g, '꩜here')
                                .replace(/@everyone/g, '꩜everyone')
                                .replace(/@horde/g, '꩜horde')
                                .replace(/@alliance/g, '꩜alliance')
                                .replace(/@alliance/g, '꩜alliance')
                                .replace(/@Guild Leader - Horde/g, '꩜Guild Leader - Horde')
                                .replace(/@Guild Leader - Alliance/g, '꩜Guild Leader - Alliance')
                                .replace(/@Guild Officer - Horde/g, '꩜Guild Officer - Horde')
                                .replace(/@Guild Officer - Alliance/g, '꩜Guild Officer - Alliance')
            
    
            const messageChunkSizeLimit = 2000;
            for (let i = 0; i < responseMessage.length; i += messageChunkSizeLimit) {
                const chunk = responseMessage.substring(i, i + messageChunkSizeLimit);
                clearInterval(sendTypingInterval);
                let messageReplyOptions = { content: chunk };
                let files = [];
                if (generatedImage && (i + messageChunkSizeLimit >= responseMessage.length)) {
                    files.push({ attachment: Buffer.from(generatedImage, 'base64'), name: 'lupos.png' });
                }
                messageReplyOptions = { ...messageReplyOptions, files: files};
                await message.reply(messageReplyOptions);
            }
            lastMessageSentTime = luxon.DateTime.now().toISO();
            UtilityLibrary.consoleInfo([[`║ ⏱️ Duration: `, { }], [`${timer} seconds`, { }]]);
            timerInterval.unref();
            UtilityLibrary.consoleInfo([[`╚═══════════════░▒▓ -MESSAGE- ▓▒░══════════════════╝`, { color: 'green' }]]);
        } else {
            let generatedResponse;
            let generatedImage;
            
    
            if (GENERATE_IMAGE) {
                const finalResults = await Promise.all([
                    AIService.generateText({message}),
                    AIService.generateImage(message, message.content)
                ]);
    
                generatedResponse = finalResults[0];
                generatedImage = finalResults[1];
            } else {
                generatedResponse = await AIService.generateText({message});
            }
        
            if (!generatedResponse) {
                UtilityLibrary.consoleInfo([[`║ ⏱️ Duration: `, { }], [{ prompt: timer }, { }]]);
                timerInterval.unref();
                UtilityLibrary.consoleInfo([[`╚═══════════════░▒▓ -MESSAGE- ▓▒░══════════════════╝`, { color: 'red' }]]);
                message.reply("...");
                return;
            }
    
            
        
            let responseMessage = `${generatedResponse.replace(new RegExp(`<@${client.user.id}>`, 'g'), '').replace(new RegExp(`@${client.user.tag}`, 'g'), '')}`;
    
            // replace @here and @everyone with here and everyone
            responseMessage = responseMessage
                                .replace(/@here/g, '꩜here')
                                .replace(/@everyone/g, '꩜everyone')
                                .replace(/@horde/g, '꩜horde')
                                .replace(/@alliance/g, '꩜alliance')
                                .replace(/@alliance/g, '꩜alliance')
                                .replace(/@Guild Leader - Horde/g, '꩜Guild Leader - Horde')
                                .replace(/@Guild Leader - Alliance/g, '꩜Guild Leader - Alliance')
                                .replace(/@Guild Officer - Horde/g, '꩜Guild Officer - Horde')
                                .replace(/@Guild Officer - Alliance/g, '꩜Guild Officer - Alliance')
    
            //  replace <@!1234567890> with the user's display name
            const voicePrompt = responseMessage.replace(/<@!?\d+>/g, (match) => {
                const id = match.replace(/<@!?/, '').replace('>', '');
                return findUserById(id);
            }).substring(0, 220);
    
            
            let generatedAudioFile, generatedAudioBuffer;

            if (GENERATE_VOICE) { 
                UtilityLibrary.consoleInfo([[`║ 🎤 Generating voice...`, { color: 'yellow' }]]);
                ({ filename: generatedAudioFile, buffer: generatedAudioBuffer } = await AIService.generateVoice(message, voicePrompt))
                UtilityLibrary.consoleInfo([[`║ 🎤 ... voice generated.`, { color: 'green' }]]);
            }
    
            const messageChunkSizeLimit = 2000;
            for (let i = 0; i < responseMessage.length; i += messageChunkSizeLimit) {
                const chunk = responseMessage.substring(i, i + messageChunkSizeLimit);
                clearInterval(sendTypingInterval);
                let messageReplyOptions = { content: chunk };
                let files = [];
                if (generatedAudioFile && (i + messageChunkSizeLimit >= responseMessage.length)) {
                    files.push({ attachment: await fs.promises.readFile(`${BARK_VOICE_FOLDER}/${generatedAudioFile}`), name: `${generatedAudioFile}` });
                }
                if (generatedAudioBuffer && (i + messageChunkSizeLimit >= responseMessage.length)) {
                    files.push({ attachment: Buffer.from(generatedAudioBuffer, 'base64'), name: 'lupos.mp3' });
                }
                if (generatedImage && (i + messageChunkSizeLimit >= responseMessage.length)) {
                    files.push({ attachment: Buffer.from(generatedImage, 'base64'), name: 'lupos.png' });
                }
                messageReplyOptions = { ...messageReplyOptions, files: files};
                await message.reply(messageReplyOptions);
            }
            lastMessageSentTime = luxon.DateTime.now().toISO();
            UtilityLibrary.consoleInfo([[`║ ⏱️ Duration: `, { }], [`${timer} seconds`, { }]]);
            timerInterval.unref();
            UtilityLibrary.consoleInfo([[`╚═══════════════░▒▓ -MESSAGE- ▓▒░══════════════════╝`, { color: 'green' }]]);
        }    
    }
    MoodService.instantiate();
    processingMessageQueue = false;    
}

client.on('messageCreate', async (message) => {
    if (DETECT_AND_REACT) {
        UtilityLibrary.detectHowlAndRespond(message)
        await UtilityLibrary.detectMessageAndReact(message)
    }

    if (message.content.startsWith(IGNORE_PREFIX)) {
        return;
    }

    // Ignore all messages from the bot itself
    if (message.channel.type === ChannelType.DM && message.author.id === client.user.id) {
        return;
    }

    // If the message contains lupos, messageQueue every 1/3rd of the time
    // if (message.mentions.has(client.user.id) || 
    //     (!message.mentions.has(client.user.id) && 
    //     message.content.toLowerCase().includes(client.user.displayName.toLowerCase()) && 
    //     Math.random() < 0.333)) {
    //     queue.push(message);
    //     if (!processingMessageQueue) {
    //         return await messageQueue();
    //     }
    // }
    
    // Ignore all messages if not in a DM or if the bot is not mentioned
    if (message.channel.type != ChannelType.DM && !message.mentions.has(client.user)) {
        return;
    }

    queue.push(message);
    if (!processingMessageQueue) {
        isResponding = true
        await messageQueue()
        isResponding = false
        return
    }
});

// check every 1 second
setInterval(() => {
    let currentTime = luxon.DateTime.now();
    let lastMessageSentTimeObject = luxon.DateTime.fromISO(lastMessageSentTime);
    let difference = currentTime.diff(lastMessageSentTimeObject, ['seconds']).toObject();
    if (difference.seconds >= 30) {
        // UtilityLibrary.consoleInfo([[`30 seconds or longer since last message sent`, { color: 'red' }]]);
        lastMessageSentTime = currentTime.toISO();
    }
}, 1000);

client.login(DISCORD_TOKEN);
