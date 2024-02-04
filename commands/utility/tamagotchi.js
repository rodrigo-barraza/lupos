const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const HungerService = require('../../HungerService.js');
const AlcoholService = require('../../AlcoholService.js');
const ThirstService = require('../../ThirstService.js');
const EnergyService = require('../../EnergyService.js');
const HygieneService = require('../../HygieneService.js');
const BathroomService = require('../../BathroomService.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tamagotchi')
		.setDescription('Provides information about Lupos.'),
	async execute(interaction) {
        const hungerLevel = HungerService.getHungerLevel();
        const thirstLevel = ThirstService.getThirstLevel();
        const alcoholLevel = AlcoholService.getAlcoholLevel();
        const moodLevel = 0
        const healthState = 'Healthy';
        const weight = 5;
        const height = 12;
        const age = 1;
        const energyLevel = EnergyService.getEnergyLevel();
        const boredomLevel = 100;
        const bathroomLevel = BathroomService.getBathroomLevel();
        const hygieneLevel = HygieneService.getHygieneLevel();
		// await interaction.reply(`Hunger level is ${hungerLevel}.\n
        // Alcohol level is ${alcoholLevel}.\n
        // Mood level is ${moodLevel}.\n
        // Health state is ${healthState}.\n
        // Weight is ${weight}.\n
        // Age is ${age}.\n
        // Energy level is ${energyLevel > 0 ? 'Alert' : 'Sleepy'}.\n`);

        // reply with an embed
        const Embed = new EmbedBuilder()
        .setTitle(`Pet Statistics`)
        .setDescription('The different properties of our community pet')
        // .setColor(0x00FF00)
        .addFields(
            { name: 'Hunger', value: `${hungerLevel}%`, inline: true },
            { name: 'Thirst', value: `${thirstLevel}%`, inline: true },
            // { name: 'Boredom', value: `${boredomLevel}%`, inline: true },
            { name: 'Energy', value: `${energyLevel}%`, inline: true },
            { name: 'Hygiene', value: `${hygieneLevel}%`, inline: true },

            { name: 'Intoxicated', value: `${alcoholLevel}%`, inline: true },
            { name: 'Bathroom', value: `${bathroomLevel}%`, inline: true },

            

            { name: '\u200B', value: '\u200B' },
            { name: 'Personality', value: `Spicy`, inline: true },
            { name: 'Mood', value: `${moodLevel}`, inline: true },
            { name: 'Health', value: `${healthState}`, inline: true },
            { name: 'Weight', value: `${weight}lbs`, inline: true },
            { name: 'Height', value: `${height}cm`, inline: true },
            { name: 'Age', value: `${age}`, inline: true },
            // { name: 'Energy level', value: energyLevel > 0 ? 'Alert' : 'Sleepy' }.addFields(
            // { name: 'Regular field title', value: 'Some value here' },
            // { name: '\u200B', value: '\u200B' },
            // { name: 'Inline field title', value: 'Some value here', inline: true },
            // { name: 'Inline field title', value: 'Some value here', inline: true },
        )
        // .setImage('https://i.imgur.com/AfFp7pu.png')
        // .setTimestamp()
        await interaction.reply({ embeds: [Embed] });
	},
};
