require('dotenv/config');
const {
    CHANNEL_ID_LONEWOLF_FITEWOLF,
    CHANNEL_ID_LONEWOLF_GENERAL_DISCUSSION,
    CHANNEL_ID_LONEWOLF_POLITICS,
    GUILD_ID_LONEWOLF,
    ROLE_ID_BLABBERMOUTH,
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

const client = DiscordWrapper.instantiate();

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
// D:\develop\chatter is one level up from here
// const chatterPath = path.join(__dirname, '../chatter');
const chatterPath = '\\\\wsl.localhost\\Ubuntu\\home\\rodrigo\\chatter';

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

const IGNORE_PREFIX = "!";

let previousBlabberMouthId;

async function blabberMouth(client) {
    const channel1 = client.channels.cache.get(CHANNEL_ID_LONEWOLF_FITEWOLF);
    const channel2 = client.channels.cache.get(CHANNEL_ID_LONEWOLF_GENERAL_DISCUSSION);
    const channel3 = client.channels.cache.get(CHANNEL_ID_LONEWOLF_POLITICS);
    const guild = client.guilds.cache.get(GUILD_ID_LONEWOLF);
    const roleId = ROLE_ID_BLABBERMOUTH;

    const allMessages = await Promise.all([
        channel1.messages.fetch({ limit: 33 }),
        channel2.messages.fetch({ limit: 33 }),
        channel3.messages.fetch({ limit: 33 }),
    ]);
    
    const combinedMessages = allMessages[0].concat(allMessages[1], allMessages[2]);

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

    const role = guild.roles.cache.find(role => role.id === roleId);
    const currentBlabbermouth = await guild.members.fetch(mostCommonAuthorId);
    const membersWithRole = guild.members.cache.filter(member => member.roles.cache.some(role => role.id === roleId));

    if (previousBlabberMouthId !== currentBlabbermouth.id) {
        await membersWithRole.forEach(member => member.roles.remove(role));
        currentBlabbermouth.roles.add(role);
        previousBlabberMouthId = currentBlabbermouth.id;
        console.log(`${currentBlabbermouth.displayName} has been given the role ${role.name}`);
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
        console.log('🗣 Current yappers:', mappedYappers);
    }
}

function displayAllGuilds() {
    let connectedGuildsText = '🌎 Connected Guilds: '
    client.guilds.cache.forEach(guild => {
        connectedGuildsText += `${guild.name}(${guild.id}) `;
    });
    UtilityLibrary.consoleInfo([[connectedGuildsText, {}]]);
}

client.on("ready", () => {
    UtilityLibrary.consoleInfo([[`👌 Successfully Logged in as ${client.user.tag}!`, { bold: true }]]);
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

let processingQueue = false;
const queue = []
    
async function processQueue() {
    if (processingQueue || queue.length === 0) {
        console.log('empty Queue')
        return;
    }
    processingQueue = true;
    while (queue.length > 0) {
        const message = queue.shift();
        await message.channel.sendTyping();
        const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);

        const userMention = UtilityLibrary.discordUserMention(message);
        const username = UtilityLibrary.discordUsername(message.author || message.member);
        
        UtilityLibrary.consoleInfo([[`╔═══════════════════════════════════░▒▓ +MESSAGE+ ▓▒░═══════════════════════════════════╗`, { rapidBlink: true, color: 'yellow' }]]);
        console.info(`║ 💬 Replying to: ${username}(${userMention})`);
        if (message.guild) {
            console.info(`║ 🌐 Server: ${message.guild.name}`)
            console.info(`║ 📡 Channel: #${message.channel.name}`);
        }

        let generatedResponse = await AIService.generateText({message});
    
        if (!generatedResponse) {
            UtilityLibrary.consoleInfo([[`╚═══════════════════════════════════░▒▓ -MESSAGE- ▓▒░═══════════════════════════════════╝`, { rapidBlink: true, color: 'red' }]]);
            message.reply("...");
            return;
        }
        
        // UtilityLibrary.consoleInfo(`║ 📑 Text: ${{text: generatedResponse}}`, { });

        UtilityLibrary.consoleInfo([[`║ 📑 Text: `, { }], [{ response: generatedResponse }, { }]]);


        function findUserById(id) {
            const user = client.users.cache.get(id);
            return UtilityLibrary.discordUsername(user);
        }
    
        const responseMessage = `${generatedResponse.replace(new RegExp(`<@${client.user.id}>`, 'g'), '').replace(new RegExp(`@${client.user.tag}`, 'g'), '')}`;

        //  replace <@!1234567890> with the user's display name
        const responseMessageAudio = responseMessage.replace(/<@!?\d+>/g, (match) => {
            const id = match.replace(/<@!?/, '').replace('>', '');
            return findUserById(id);
        });
        
        let generatedImage;
        let generatedAudio;

        if (GENERATE_IMAGE) { generatedImage = await AIService.generateImage(message, responseMessage) }
        if (GENERATE_VOICE) { generatedAudio = await AIService.generateVoice(message, responseMessageAudio) }

        const messageChunkSizeLimit = 2000;
        for (let i = 0; i < responseMessage.length; i += messageChunkSizeLimit) {
            const chunk = responseMessage.substring(i, i + messageChunkSizeLimit);
            clearInterval(sendTypingInterval);
            let messageReplyOptions = { content: chunk };
            let files = [];
            if (generatedAudio && (i + messageChunkSizeLimit >= responseMessage.length)) {
                // files.push({ attachment: Buffer.from(generatedAudio, 'base64'), name: 'lupos.mp3' });
                files.push({ attachment: await fs.promises.readFile(`${BARK_VOICE_FOLDER}/${generatedAudio}`), name: 'lupos.mp3' });
            }
            if (generatedImage && (i + messageChunkSizeLimit >= responseMessage.length)) {
                files.push({ attachment: Buffer.from(generatedImage, 'base64'), name: 'lupos.png' });
            }
            messageReplyOptions = { ...messageReplyOptions, files: files};
            await message.reply(messageReplyOptions);
        }
        UtilityLibrary.consoleInfo([[`╚═══════════════════════════════════░▒▓ -MESSAGE- ▓▒░═══════════════════════════════════╝`, { rapidBlink: true, color: 'green' }]]);
    }
    MoodService.instantiate();
    processingQueue = false;
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

    // If the message contains lupos, processQueue every 1/3rd of the time
    // if (message.mentions.has(client.user.id) || 
    //     (!message.mentions.has(client.user.id) && 
    //     message.content.toLowerCase().includes(client.user.displayName.toLowerCase()) && 
    //     Math.random() < 0.333)) {
    //     queue.push(message);
    //     if (!processingQueue) {
    //         return await processQueue();
    //     }
    // }
    
    // Ignore all messages if not in a DM or if the bot is not mentioned
    if (message.channel.type != ChannelType.DM && !message.mentions.has(client.user)) {
        return;
    }

    queue.push(message);
    if (!processingQueue) {
        return await processQueue()
    }
});

client.login(DISCORD_TOKEN);
