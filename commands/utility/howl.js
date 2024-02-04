const { SlashCommandBuilder } = require('discord.js');
const UtilityLibrary = require('../../UtilityLibrary.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('howl')
		.setDescription('Raise your head up high, and call upon the full moon.'),
	async execute(interaction) {
		const howl = UtilityLibrary.howl();
		await interaction.reply(howl);
	},
};