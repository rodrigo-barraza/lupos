process.env.NODE_NO_WARNINGS = 'stream/web';
require('dotenv/config');
const {
    WHITEMANE_YAPPER_ROLE_ID, WHITEMANE_OVERREACTOR_ROLE_ID, WHITEMANE_POLITICS_CHANNEL_ID, GUILD_ID_WHITEMANE,
    GENERATE_VOICE, BLABBERMOUTH, DETECT_AND_REACT, DISCORD_TOKEN, BARK_VOICE_FOLDER 
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
const PuppeteerWrapper = require('./wrappers/PuppeteerWrapper.js');

let isResponding = false
const IGNORE_PREFIX = "!";
let previousTopAuthorId;
let previousOverReactorId;
let lastMessageSentTime = luxon.DateTime.now().toISO()
let processingMessageQueue = false;
const queue = []

const client = DiscordWrapper.instantiate();

// client.commands = new Collection();
// const foldersPath = path.join(__dirname, 'commands');
// const commandFolders = fs.readdirSync(foldersPath);

// for (const folder of commandFolders) {
// 	const commandsPath = path.join(foldersPath, folder);
// 	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
// 	for (const file of commandFiles) {
// 		const filePath = path.join(commandsPath, file);
// 		const command = require(filePath);
// 		// Set a new item in the Collection with the key as the command name and the value as the exported module
// 		if ('data' in command && 'execute' in command) {
// 			client.commands.set(command.data.name, command);
// 		} else {
// 			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
// 		}
// 	}
// }

// client.on(Events.InteractionCreate, async interaction => {
// 	if (!interaction.isChatInputCommand()) return;

// 	const command = interaction.client.commands.get(interaction.commandName);

// 	if (!command) {
// 		console.error(`No command matching ${interaction.commandName} was found.`);
// 		return;
// 	}

// 	try {
// 		await command.execute(interaction);
// 	} catch (error) {
// 		console.error(error);
// 		if (interaction.replied || interaction.deferred) {
// 			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
// 		} else {
// 			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
// 		}
// 	}
// });

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

        if (mostCommonOverReactor?.count > 4) {
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

function userIdToUsername(client, text) {
    return text.replace(new RegExp(`<@${client.user.id}>`, 'g'), '').replace(new RegExp(`@${client.user.tag}`, 'g'), '');
}

function removeMentions(text) {
    return text
    .replace(/@here/g, '꩜here')
    .replace(/@everyone/g, '꩜everyone')
    .replace(/@horde/g, '꩜horde')
    .replace(/@alliance/g, '꩜alliance')
    .replace(/@alliance/g, '꩜alliance')
    .replace(/@Guild Leader - Horde/g, '꩜Guild Leader - Horde')
    .replace(/@Guild Leader - Alliance/g, '꩜Guild Leader - Alliance')
    .replace(/@Guild Officer - Horde/g, '꩜Guild Officer - Horde')
    .replace(/@Guild Officer - Alliance/g, '꩜Guild Officer - Alliance')
}

let usersMentionedCount = 0;

async function generateImagePromptAndMessageContent(message, user, returnImagePrompt, returnMessageContent) {
    console.log(9999999999999999, returnMessageContent)
    usersMentionedCount++;
    const discordUsername = UtilityLibrary.discordUsername(user);
    const member = message.guild.members.cache.get(user.id);
    const roles = member ? member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ') : 'No roles';
    const banner = await DiscordWrapper.getBannerFromUserId(user.id);
    const bannerUrl = banner ? `https://cdn.discordapp.com/banners/${user.id}/${banner}.jpg?size=512` : '';
    const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg?size=512` : '';
    const userLabel = `User-${usersMentionedCount}`;
    let userVisualDescription = discordUsername;
    let textDescription = `\n${userLabel} mentioned name: ${discordUsername}\n${userLabel} mentioned discord tag: <@${user.id}>`;

    let systemPromptDescription = `# ${userLabel} Mentioned`
    systemPromptDescription += `\nName: ${discordUsername}`;
    systemPromptDescription += `\nDiscord Tag: <@${user.id}>`;

    if (avatarUrl) {
        const generatedVision = await AIService.generateVision(avatarUrl, 'Describe this image');
        const avatarImageDescription = `${generatedVision.choices[0].message.content}.`;
        textDescription += `\n${userLabel} mentioned foreground description: ${avatarImageDescription}`;
        userVisualDescription += ` (Foreground: ${avatarImageDescription})`;
        systemPromptDescription += `\nCharacter Description: ${avatarImageDescription}`;
    }

    if (bannerUrl) {
        const generatedVision = await AIService.generateVision(bannerUrl, 'Describe this image');
        const bannerImageDescription = `${generatedVision.choices[0].message.content}.`;
        textDescription += `\n${userLabel} mentioned background description: ${bannerImageDescription}`;
        userVisualDescription += ` (Background: ${bannerImageDescription})`;
        systemPromptDescription += `\nBackground Description: ${bannerImageDescription}`;
    }

    if (roles) {
        textDescription += `\n${userLabel} mentioned roles: ${roles}`;
        systemPromptDescription += `\nTraits: ${roles}`;
    }

    returnImagePrompt = returnImagePrompt.replace(`<@${user.id}>`, userVisualDescription);
    returnMessageContent = `${returnMessageContent}\n\n${textDescription}`
    console.log(9999999999999999, returnMessageContent)
    UtilityLibrary.consoleInfo([[`❓ ${userLabel} mentioned: ${UtilityLibrary.discordUsername(user)}`, { color: 'green' }, 'middle']]);
    return { returnImagePrompt, returnMessageContent, systemPromptDescription };
}

async function processUserMentions(client, messageToCheck, message, imageToGenerate) {
    let userMentions;
    let returnImagePrompt = imageToGenerate;
    let returnMessageContent = messageToCheck.content;
    let messageToCheckHasMentions = returnMessageContent.match(/<@!?\d+>/g);
    let messageHasMentions = message.content.match(/<@!?\d+>/g);
    if (messageToCheckHasMentions?.length || messageHasMentions?.length) {
        const userIdsInMessage = messageHasMentions?.map(user => user.replace(/<@!?/, '').replace('>', '')) || [];
        const userIdsInMessageToCheck = messageToCheckHasMentions?.map(user => user.replace(/<@!?/, '').replace('>', '')) || [];
        if (userIdsInMessageToCheck?.length) {
            const combinedUserIds = [...new Set([...userIdsInMessage, ...userIdsInMessageToCheck])];
            let currentUser = 0;
            for (const userId of combinedUserIds) {
                if (userId === client.user.id) {
                    continue;
                }
                currentUser++;
                const user = client.users.cache.get(userId);
                if (user) {
                    ({ returnImagePrompt: returnImagePrompt, returnMessageContent: returnMessageContent, systemPromptDescription: userMentions } = await generateImagePromptAndMessageContent(message, user, returnImagePrompt, returnMessageContent));
                }
            }
        }
    }
    return { returnImagePrompt, returnMessageContent, userMentions };
}

async function processSelfMention(messageToCheck, message, imageToGenerate) {
    let systemPromptDescription;
    let returnImagePrompt = imageToGenerate;
    let returnMessageContent = messageToCheck.content;
    const user = messageToCheck.author;
    if (messageToCheck.content.match(/(\bme\b)/g) && user) {
        ({ returnImagePrompt: returnImagePrompt, returnMessageContent: returnMessageContent, systemPromptDescription: systemPromptDescription } = await generateImagePromptAndMessageContent(message, user, returnImagePrompt, returnMessageContent));
    }
    return { returnImagePrompt, returnMessageContent, systemPromptDescription };
}

async function processEmojis(messageToCheck, imageToGenerate) {
    let returnImagePrompt = imageToGenerate;
    let returnMessageContent = messageToCheck.content;
    let emojis = returnMessageContent.split(' ').filter(part => /<(a)?:.+:\d+>/g.test(part));
    if (emojis) {
        let currentEmoji = 0;
        for (const emoji of emojis) {
            currentEmoji++;
            const emojiId = emoji.split(":").pop().slice(0, -1);
            const emojiName = emoji.match(/:.+:/g)[0].replace(/:/g, '');
            const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
            const eyes = await AIService.generateVision(emojiUrl, `Describe this image named ${emojiId}. Do not mention that it is low quality, resolution, or pixelated.`);
            const emojiImageDescription = `${emojiName} (${eyes.choices[0].message.content})`;
            const textDescription = 
`Emoji ${currentEmoji} name: ${emojiName}
Emoji ${currentEmoji} description: ${eyes.choices[0].message.content}`;
            returnImagePrompt = imageToGenerate.replace(emoji, emojiImageDescription);
            returnMessageContent = `${textDescription}\n\n${returnMessageContent.replace(emoji, emojiName)}`;
            UtilityLibrary.consoleInfo([[`❓ Emoji mentioned: ${emojiName}`, { color: 'green' }, 'middle']]);
        }
    }
    return { returnImagePrompt, returnMessageContent };
}

async function processImageAttachmentsAndUrls(message, imageToGenerate) {
    let returnImagePrompt = imageToGenerate;
    let returnMessageContent = message.content;
    let images = await extractImagesFromAttachmentsAndUrls(message);
    if (images.length > 0) {
        let currentImage = 0;
        for (const image of images) {
            currentImage++;
            const eyes = await AIService.generateVision(image, 'Describe this image');
            const imageDescription = `${eyes.choices[0].message.content}`;
            const textDescription = 
`Attached image ${currentImage} description: ${eyes.choices[0].message.content}
Attached image ${currentImage} URL: ${image}`;
            // if image exists in imageToGenerate, replace it with the description
            if (imageToGenerate.includes(image)) {
                returnImagePrompt = imageToGenerate.replace(image, `(${imageDescription})`);
            } else {
                if (imageToGenerate.length > 0) {
                    returnImagePrompt = `${imageToGenerate}. (${imageDescription})`;
                } else {
                    returnImagePrompt = `(${imageDescription})`;
                }
            }
            returnMessageContent = `${textDescription}\n\n${returnMessageContent}`;
            UtilityLibrary.consoleInfo([[`Image attached: ${image}`, { color: 'green' }, 'middle']]);
        }
    }
    return { returnImagePrompt, returnMessageContent }
}

async function processReply(client, message, imageToGenerate) {
    let returnImagePrompt = imageToGenerate;
    let returnMessageContent = message.content;
    let userReply;
    if (message.reference) {
        const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
        returnMessageContent = originalMessage.content;
        if (originalMessage) {
            ({ returnImagePrompt: imageToGenerate, returnMessageContent: originalMessage.content } = await processUserMentions(client, originalMessage, message, imageToGenerate));
            ({ returnImagePrompt: imageToGenerate, returnMessageContent: originalMessage.content } = await processEmojis(originalMessage, imageToGenerate));
            ({ returnImagePrompt: imageToGenerate, returnMessageContent: originalMessage.content } = await processImageAttachmentsAndUrls(originalMessage, imageToGenerate));

            const username = UtilityLibrary.discordUsername(originalMessage.author);
            const userId = UtilityLibrary.discordUserId(originalMessage);
            const originalMessageContent = originalMessage.content;

            returnImagePrompt = `${imageToGenerate}.`;

            returnMessageContent = `${message.content}`;
            returnMessageContent += `\n\n# I'm replying to another user's message`;
            returnMessageContent += `\nUser: ${username}`
            returnMessageContent += `\nDiscord used ID tag: <@${userId}>`
            returnMessageContent += `\nMessage: ${originalMessageContent}`

            userReply = `# Primary participant is quoting another user`;
            userReply += `\nQuoted user: ${username}`
            userReply += `\nQuoted user's Discord user ID tag: <@${userId}>`
            userReply += `\nQuoted user's message: ${originalMessageContent}`

            UtilityLibrary.consoleInfo([[`❓ Quoted user: ${username}`, { color: 'green' }, 'middle']]);
        }
    }
    return { returnImagePrompt, returnMessageContent, userReply };
}

async function autoAssignRoles(client) {
    const channel1 = client.channels.cache.get(WHITEMANE_POLITICS_CHANNEL_ID);
    const guild = client.guilds.cache.get(GUILD_ID_WHITEMANE);

    try {
        const allMessages = await Promise.all([
            channel1.messages.fetch({ limit: 100 })
        ]);
    
        if (!allMessages[0]) return;
    
        const combinedMessages = allMessages[0];
    
        await generateOverReactors(combinedMessages, guild);
        await generateYappers(combinedMessages, guild);
    } catch (error) {
        console.error(error);
    }
}

function displayAllGuilds() {
    const guildArray = []
    client.guilds.cache.forEach(guild => {
        guildArray.push(guild);
    });
    let connectedGuildsText = `🌎 Connected Guilds (Servers): ${guildArray.length }`
    UtilityLibrary.consoleInfo([[connectedGuildsText, {}]]);
}

async function extractImagesFromAttachmentsAndUrls(message) {
    let images = [];
    const urls = message.content.match(/(https?:\/\/[^\s]+)/g);
    if (message.attachments.size) {
        for (const attachment of message.attachments.values()) {
            const isImage = attachment.contentType.includes('image');
            if (isImage) {
                images.push(attachment.url);
            }
        }
    }
    if (urls?.length) {
        for (const url of urls) {
            if (!url.includes('https://tenor.com/view/')) {
                const isImage = await UtilityLibrary.isImageUrl(url);
                if (isImage) {
                    images.push(url);
                }
            } else {
                const tenorImage = await PuppeteerWrapper.scrapeTenor(url);
                images.push(tenorImage.image);
            }
        }
    }
    return images;
}

function onReady() {
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

async function onMessageCreate(message) {
    if (DETECT_AND_REACT) {
        UtilityLibrary.detectHowlAndRespond(message)
        await UtilityLibrary.detectMessageAndReact(message)
    }
    const isDirectMessageByBot = message.channel.type === ChannelType.DM && message.author.id === client.user.id;
    const isMessageWithoutBotMention = message.channel.type != ChannelType.DM && !message.mentions.has(client.user);

    if (message.content.startsWith(IGNORE_PREFIX)) { return }
    if (isDirectMessageByBot) { return }
    if (isMessageWithoutBotMention) { return }

    queue.push(message);
    if (!processingMessageQueue) {
        isResponding = true
        await messageQueue()
        isResponding = false
        return
    }
}


UtilityLibrary.consoleInfo([[`---`, { bold: true, color: 'green' }]]);
UtilityLibrary.consoleInfo([[`🤖 Lupos v1.0 starting`, { bold: true, color: 'red' }]]);
    
async function messageQueue() {
    if (processingMessageQueue || queue.length === 0) {
        console.log('Message Queue is currently processing or empty');
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
        
        UtilityLibrary.consoleInfo([[`═══════════════░▒▓ +MESSAGE+ ▓▒░════════════════════════════════════`, { color: 'yellow' }, 'start']]);

        if (message.guild) {
            UtilityLibrary.consoleInfo([[`💬 Replying to: ${discordUserTag} in ${message.guild.name} #${message.channel.name}`, { color: 'cyan' }, 'middle']]);
        } else {
            UtilityLibrary.consoleInfo([[`💬 Replying to: ${discordUserTag} in a private message`, { color: 'cyan' }, 'middle']]);
        }

        let userMentions;
        let userReply;
        let imageToGenerate = message.content;
        imageToGenerate = userIdToUsername(client, imageToGenerate);
        ({ returnImagePrompt: imageToGenerate, returnMessageContent: message.content, userMentions: userMentions } = await processUserMentions(client, message, message, imageToGenerate));
        ({ returnImagePrompt: imageToGenerate, returnMessageContent: message.content } = await processSelfMention(message, message, imageToGenerate));
        ['draw ', 'draw me '].forEach(substring => { imageToGenerate = imageToGenerate.replace(substring, '') });
        ({ returnImagePrompt: imageToGenerate, returnMessageContent: message.content } = await processImageAttachmentsAndUrls(message, imageToGenerate));
        ({ returnImagePrompt: imageToGenerate, returnMessageContent: message.content } = await processEmojis(message, imageToGenerate));
        ({ returnImagePrompt: imageToGenerate, returnMessageContent: message.content, userReply: userReply } = await processReply(client, message, imageToGenerate));

        let generatedImagePrompt = await AIService.generateImagePrompt(message, imageToGenerate);
        let generatedTextResponse = await AIService.generateTextResponse({ message }, generatedImagePrompt, userMentions, userReply);

        let newImagePrompt = await AIService.createImagePromptFromImageAndText(message, generatedImagePrompt, generatedTextResponse, imageToGenerate);
        let generatedImage = await AIService.generateImage(newImagePrompt);
    
        if (!generatedTextResponse) {
            UtilityLibrary.consoleInfo([[`⏱️ Duration: ${timer} seconds`, { color: 'cyan' }, 'middle']]);
            timerInterval.unref();
            UtilityLibrary.consoleInfo([[`═══════════════░▒▓ -MESSAGE- ▓▒░════════════════════════════════════`, { color: 'red' }, 'end']]);
            message.reply("...");
            return;
        }
    
        let responseMessage = userIdToUsername(client, generatedTextResponse);
        responseMessage = removeMentions(responseMessage);

        //  replace <@!1234567890> with the user's display name
        const voicePrompt = responseMessage.replace(/<@!?\d+>/g, (match) => {
            const id = match.replace(/<@!?/, '').replace('>', '');
            return UtilityLibrary.findUserById(client, id);
        }).substring(0, 220);

        
        let generatedAudioFile, generatedAudioBuffer;

        if (GENERATE_VOICE) { 
            UtilityLibrary.consoleInfo([[`🎤 Generating voice...`, { color: 'yellow' }, 'middle']]);
            ({ filename: generatedAudioFile, buffer: generatedAudioBuffer } = await AIService.generateVoice(message, voicePrompt))
            UtilityLibrary.consoleInfo([[`🎤 ... voice generated.`, { color: 'green' }, 'middle']]);
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
        
        UtilityLibrary.consoleInfo([[`⏱️ Duration: ${timer} seconds`, { color: 'cyan' }, 'middle']]);
        timerInterval.unref();
        usersMentionedCount = 0;
        
        if (message.guild) {
            UtilityLibrary.consoleInfo([[`💬 Replied to: ${discordUserTag} in ${message.guild.name} #${message.channel.name}`, { color: 'cyan' }, 'middle']]);
        } else {
            UtilityLibrary.consoleInfo([[`💬 Replied to: ${discordUserTag} in a private message`, { color: 'cyan' }, 'middle']]);
        }
        UtilityLibrary.consoleInfo([[`═══════════════░▒▓ -MESSAGE- ▓▒░════════════════════════════════════`, { color: 'green' }, 'end']]);
    }
    MoodService.instantiate();
    processingMessageQueue = false;    
}

client.on(Events.ClientReady, onReady);
client.on(Events.MessageCreate, onMessageCreate);
client.on(Events.MessageReactionAdd, async message => {
    // console.log('Reaction added:', message);
});

setInterval(() => {
    let currentTime = luxon.DateTime.now();
    let lastMessageSentTimeObject = luxon.DateTime.fromISO(lastMessageSentTime);
    let difference = currentTime.diff(lastMessageSentTimeObject, ['seconds']).toObject();
    if (difference.seconds >= 30) {
        lastMessageSentTime = currentTime.toISO();
    }
}, 1000);

client.login(DISCORD_TOKEN);
