const { SlashCommandBuilder } = require('discord.js');
const AlcoholService = require('../../services/AlcoholService.js');
const MoodService = require('../../services/MoodService.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('drink')
		.setDescription('Make Lupos take a swig from a random alcoholic beverage.'),
    async execute(interaction) {
        await interaction.deferReply();
        const characterResponse = await AlcoholService.drinkAlcohol(interaction);
		MoodService.increaseMoodLevel();
        await interaction.editReply(characterResponse);
    },
};