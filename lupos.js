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

let lastMessageSentTime = luxon.DateTime.now().toISO()
let isResponding = false

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

async function generateOverReactors(combinedMessages, guild) {
    const overReactorRoleId = WHITEMANE_OVERREACTOR_ROLE_ID;

    const userIds = [];
    let mostCommonOverReactor;
  
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
        
        mostCommonOverReactor = userIds.reduce((acc, user) => (user.count > acc.count ? user : acc), userIds[0]);

        if (mostCommonOverReactor.count > 4) {
            const overReactorRole = guild.roles.cache.find(role => role.id === overReactorRoleId);
            const currentOverReactor = await guild.members.fetch(mostCommonOverReactor.id);
    
            const membersWithRole = guild.members.cache.filter(member => member.roles.cache.some(role => role.id === overReactorRoleId));
            if (previousOverReactorId !== currentOverReactor.id) {
                await membersWithRole.forEach(member => member.roles.remove(overReactorRole));
                currentOverReactor.roles.add(overReactorRole);
                previousOverReactorId = currentOverReactor.id;
                UtilityLibrary.consoleInfo([[`🤯 ${currentOverReactor.displayName} has been given the role ${overReactorRole.name}`, { color: 'red' }]]);
            }
        } else {
            const overreactorRole = guild.roles.cache.find(role => role.id === overReactorRoleId);
            const membersWithRole = guild.members.cache.filter(member => member.roles.cache.some(role => role.id === overReactorRoleId));
            await membersWithRole.forEach(member => member.roles.remove(overreactorRole));
        }
    } catch (err) {
      console.error('Error in processing:', err);
    }
}

async function generateYappers(combinedMessages, guild) {
    const yapperRoleId = WHITEMANE_YAPPER_ROLE_ID;
    const yapperRole = guild.roles.cache.find(role => role.id === yapperRoleId);

    const authorCounts = combinedMessages.reduce((counts, message) => {
        const authorId = message.author.id;
        let authorObj = counts.find(obj => obj.authorId === authorId);
        if (!authorObj) {
            authorObj = { 
                authorId: authorId,
                displayName: message.author.globalName || 'Unknown',
                count: 0,
                earliestTimestamp: message.createdTimestamp
            };
            counts.push(authorObj);
        }
        authorObj.count++;
        authorObj.earliestTimestamp = Math.min(authorObj.earliestTimestamp, message.createdTimestamp);
    
        return counts;
    }, []);

    const topAuthorCounts = authorCounts
    .sort((a, b) => a.count - b.count)
    .slice(0, 5);

    const topAuthorId = topAuthorCounts.reduce((a, b) => a.count > b.count ? a : b).authorId;
    
    const topAuthor = await guild.members.fetch(topAuthorId);
    const membersWithYapperRole = guild.members.cache.filter(member => member.roles.cache.some(role => role.id === yapperRoleId));

    if (previousTopAuthorId !== topAuthor.id) {
        await membersWithYapperRole.forEach(member => member.roles.remove(yapperRole));
        topAuthor.roles.add(yapperRole);
        previousTopAuthorId = topAuthor.id;
        UtilityLibrary.consoleInfo([[`🤌 ${topAuthor.displayName} has been given the role ${yapperRole.name}`, { color: 'red' }]]);
    }

    const currentYappers = YapperService.getYappers();

    if (!UtilityLibrary.areArraysEqual(currentYappers, topAuthorCounts)) {
        YapperService.setYappers(topAuthorCounts);
        // console.log('🗣 Current yappers:', mappedYappers);
    }
}

const IGNORE_PREFIX = "!";

let previousTopAuthorId;

let previousOverReactorId;

async function autoAssignRoles(client) {
    const channel1 = client.channels.cache.get(WHITEMANE_POLITICS_CHANNEL_ID);
    const guild = client.guilds.cache.get(GUILD_ID_WHITEMANE);

    const allMessages = await Promise.all([
        channel1.messages.fetch({ limit: 100 })
    ]);
    
    const combinedMessages = allMessages[0]

    await generateOverReactors(combinedMessages, guild);
    await generateYappers(combinedMessages, guild);
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
        autoAssignRoles(client)
        setInterval(() => {
            autoAssignRoles(client)
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
        
        const isDrawRequest = ['draw', 'sketch', 'paint', 'image', 'make', 'redo', 'render'].some(substring => message.content.toLowerCase().includes(substring));
        

        let imageToGenerate = message.content;

        if (message.content.match(/<@!?\d+>/g)) {
            const userIds = message.content.match(/<@!?\d+>/g).map(user => user.replace(/<@!?/, '').replace('>', ''));
            for (const userId of userIds) {
                if(userId === client.user.id) continue;
                const user = client.users.cache.get(userId);
                if (user) {
                    const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg`
                    const eyes = await AIService.generateVision(avatarUrl, 'Describe this image');
                    let member = message.guild.members.cache.get(user.id);
                    let roles = member ? member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ') : 'No roles';
                    const imageDescription = `${UtilityLibrary.discordUsername(user)} (${eyes.choices[0].message.content} ${roles}.)`;
                    // const textDescription = `<@${userId}> (Username: ${UtilityLibrary.discordUsername(user)}, Visual Description: ${eyes.choices[0].message.content} [Attributes]: ${roles}.)`;
                    const textDescription = 
`User ID: ${userId}
Username: ${UtilityLibrary.discordUsername(user)}
Discord Tag: <@${userId}>
Visual Description: ${eyes.choices[0].message.content}
Roles: ${roles}`;
                    imageToGenerate = imageToGenerate.replace(`<@${userId}>`, imageDescription);
                    // message.content = message.content.replace(`<@${userId}>`, textDescription);
                    message.content = 
`${textDescription}
                    
${message.content}`
                    
                }
            }   
        }

        async function hasImageAttachmentOrUrl(message) {
            let hasImage = false;
            const urls = message.content.match(/(https?:\/\/[^\s]+)/g);
            if (message.attachments.size) {
                const attachment = message.attachments.first();
                const isImage = attachment.contentType.includes('image');
                if (isImage) {
                    hasImage = attachment.url;
                }
            } else if (urls?.length) {
                const url = urls[0];
                const isImage = await UtilityLibrary.isImageUrl(url);
                if (isImage) {
                    hasImage = url;
                }
            }
            return hasImage;
        }

        let imageAttachmentOrUrl = await hasImageAttachmentOrUrl(message);

        if (imageAttachmentOrUrl) {
            const eyes = await AIService.generateVision(imageAttachmentOrUrl, 'Describe this image');
            const imageDescription = `${eyes.choices[0].message.content}`;
            imageToGenerate = imageToGenerate + ' Image attached: ' + imageDescription;
            message.content = 
`Image attached: ${imageDescription}

${message.content}`;
        }

        // if this is a reply to a message, get the original message
        if (message.reference) {
            const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
            if (originalMessage) {
                const username = UtilityLibrary.discordUsername(originalMessage.author);
                const userId = UtilityLibrary.discordUserId(originalMessage);
                const originalMessageContent = originalMessage.content;
                imageToGenerate = `${imageToGenerate} Replying to message by <@${userId}> (${username}): ${originalMessageContent}`;
                message.content =
`Quote User ID: <@${userId}>
Quote Username: ${username}
Quote Discord Tag: <@${userId}>
Quote Message: ${originalMessageContent}

${message.content}`;
                let imageAttachmentOrUrl = await hasImageAttachmentOrUrl(originalMessage);
                if (imageAttachmentOrUrl) {
                    const eyes = await AIService.generateVision(imageAttachmentOrUrl, 'Describe this image');
                    const imageDescription = `${eyes.choices[0].message.content}`;
                    imageToGenerate = imageToGenerate + ' Image attached: ' + imageDescription;
                    message.content =
`Quote attached image: ${imageDescription}

${message.content}`;
                }
                // const eyes = await AIService.generateVision(originalMessageContent, 'Describe this image');
                // const imageDescription = `${eyes.choices[0].message.content}`;
                // imageToGenerate = imageToGenerate + ' Original message: ' + imageDescription;
                // message.content = message.content + ' Original message: ' + imageDescription;
            }
        }
        
        console.log(1234567890)
        console.log(message.content)
        if (isDrawRequest && GENERATE_IMAGE) {
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
                return UtilityLibrary.findUserById(client, id);
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
