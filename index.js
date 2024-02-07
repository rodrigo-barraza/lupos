require('dotenv/config');
const { botTestingChannelId, loneWolfFitewolfChannelId, loneWolfGeneralDiscussionChannelId, loneWolfPoliticsChannelId, loneWolfGuildId, blabberMouthId, loneWolfTheBlackListChannelId } = require('./config.json');
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
const YapperService = require('./services/YapperService.js');

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

async function checkBotPermissions(client, botTestingChannelId, roleName = 'Yapper') {
    const channel = await client.channels.fetch(botTestingChannelId);
    if (!channel) return console.log('Channel not found');
    const guild = guild;
    
    const botMember = guild.members.cache.get(client.user.id);
    if (!botMember) return console.log('Bot member not found in guild');
    
    const hasPermission = botMember.permissions.has("ManageRoles");
    console.log(`Bot has ManageRoles permission: ${hasPermission}`);
    
    const role = guild.roles.cache.find(role => role.name === roleName);
    if (!role) return console.log(`Role ${roleName} not found`);
    
    const botHighestRolePosition = botMember.roles.highest.position;
    const rolePosition = role.position;
    
    console.log(`Bot's highest role position: ${botHighestRolePosition}, Target role position: ${rolePosition}`);
    if (botHighestRolePosition <= rolePosition) {
        console.log('Bot does not have a higher role than the target role. Cannot manage this role.');
    } else {
        console.log('Bot has the capability to manage the target role.');
    }
}

let previousBlabberMouthId;

async function blabberMouth(client) {
    // find messages in specific channel
    const channel1 = client.channels.cache.get(loneWolfFitewolfChannelId);
    const channel2 = client.channels.cache.get(loneWolfGeneralDiscussionChannelId);
    const channel3 = client.channels.cache.get(loneWolfPoliticsChannelId);
    const guild = client.guilds.cache.get(loneWolfGuildId);
    const roleId = blabberMouthId;

    const allMessages = await Promise.all([
        channel1.messages.fetch({ limit: 100 }),
        channel2.messages.fetch({ limit: 100 }),
        channel3.messages.fetch({ limit: 100 }),
    ]);
    
    const combinedMessages = allMessages[0].concat(allMessages[1], allMessages[2]);

    // find the most common author.id in messages array
    const authorCounts = combinedMessages.reduce((counts, message) => {
        const authorId = message.author.id;
        if (!counts[authorId]) {
            counts[authorId] = 0;
        }
        counts[authorId]++;
        return counts;
    }, {});

    const mostCommonAuthorId = Object.keys(authorCounts).reduce((a, b) => authorCounts[a] > authorCounts[b] ? a : b);

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
    const sortedAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]);
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
        console.log('Current yappers:', mappedYappers);
    }

}

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    AlcoholService.instantiate();
    MoodService.instantiate();
    // checkBotPermissions(client, botTestingChannelId);

    blabberMouth(client)
    setInterval(() => {
        blabberMouth(client)
    }, 10 * 1000);
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
