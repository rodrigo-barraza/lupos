const { SlashCommandBuilder } = require('discord.js');
const OpenAIWrapper = require('../../wrappers/OpenAIWrapper.js');
const DungeonTimerService = require('../../services/DungeonTimerService.js');
const MoodService = require('../../services/MoodService.js');
const moment = require('moment');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('timer')
		.setDescription('Find out when the next raid reset timer date is.'),
    async execute(interaction) {
        await interaction.deferReply();
        const reply = await DungeonTimerService.dungeonTimerMessage(interaction);
        MoodService.decreaseMoodLevel();
        await interaction.editReply(reply);
    },
};