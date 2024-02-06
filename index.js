require('dotenv/config');
const fs = require('node:fs');
const path = require('node:path');
const { Collection, Events, ChannelType } = require('discord.js');
const { OpenAI } = require('openai');
const UtilityLibrary = require('./libraries/UtilityLibrary.js');
const AlcoholService = require('./services/AlcoholService.js');
const MoodService = require('./services/MoodService.js');
const MessageService = require('./services/MessageService.js');
const DiscordWrapper = require('./wrappers/DiscordWrapper.js');
const AIWrapper = require('./wrappers/AIWrapper.js');
const AIService = require('./services/AIService.js');

const client = DiscordWrapper.instantiate();

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

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

async function fetchMessages(client) {
    // find messages in specific channel
    const channel = client.channels.cache.get('1198326193984913470');
    if (!channel) return;
    const messages = await channel.messages.fetch({ limit: 100 });
    console.log(messages)
    // find the most common author.id in messages array
    const authorCounts = messages.reduce((counts, message) => {
        const authorId = message.author.id;
        if (!counts[authorId]) {
            counts[authorId] = 0;
        }
        counts[authorId]++;
        return counts;
    }, {});
    
    const mostCommonAuthorId = Object.keys(authorCounts).reduce((a, b) => authorCounts[a] > authorCounts[b] ? a : b);
    
    console.log(mostCommonAuthorId);
}

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    AlcoholService.instantiate();
    MoodService.instantiate();
    // setInterval(() => {
    //     fetchMessages(client)
    // }, 2000);
  }
);

client.on('messageCreate', async (message) => {

    UtilityLibrary.detectHowlAndRespond(message)
    UtilityLibrary.detectMessageAndReact(message)

    if (message.content.startsWith(IGNORE_PREFIX)) return;
    // Reply only if the bot is mentioned, or if it's a direct message
    if (message.channel.type != ChannelType.DM && !message.mentions.has(client.user)) return;

    // if it's a DM and a message from the bot, ignore it
    if (message.channel.type === ChannelType.DM && message.author.id === client.user.id) return;

    await message.channel.sendTyping();
    const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
    let conversation = await AIService.generateConversation(message, client);
    let response = await AIWrapper.generateResponse(conversation);
    clearInterval(sendTypingInterval);

    if (!response) {
        message.reply("...");
        return;
    }

    const responseMessage = `${response.choices[0].message.content.replace(new RegExp(`<@${client.user.id}>`, 'g'), '').replace(new RegExp(`@${client.user.tag}`, 'g'), '')}`;

    const messageChunkSizeLimit = 2000; 
    
    for (let i = 0; i < responseMessage.length; i+= messageChunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + messageChunkSizeLimit);
        await message.reply({ content: chunk });
    }
    
});

client.login(process.env.TOKEN);
