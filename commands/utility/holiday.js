const { SlashCommandBuilder } = require('discord.js');
const HolidayService = require('../../services/HolidayService.js');
const MoodService = require('../../services/MoodService.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('holiday')
		.setDescription('Inquire about the next upcoming holiday.'),
    async execute(interaction) {
        await interaction.deferReply();
        const reply = await HolidayService.dungeonTimerMessage(interaction);
        MoodService.decreaseMoodLevel();
        await interaction.editReply(reply);
    },
};