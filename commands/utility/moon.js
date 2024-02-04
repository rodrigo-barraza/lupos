const { SlashCommandBuilder } = require('discord.js');
const UtilityLibrary = require('../../UtilityLibrary.js');
const moment = require('moment');

const fullMoons = [
    { date: '2024-01-25', name: 'Wolf Moon' },
    { date: '2024-02-24', name: 'Snow Moon' },
    { date: '2024-03-25', name: 'Worm Moon' },
    { date: '2024-04-23', name: 'Pink Moon' },
    { date: '2024-05-23', name: 'Flower Moon' },
    { date: '2024-06-21', name: 'Strawberry Moon' },
    { date: '2024-07-21', name: 'Buck Moon' },
    { date: '2024-08-19', name: 'Sturgeon Moon' },
    { date: '2024-09-17', name: 'Harvest Moon' },
    { date: '2024-10-17', name: 'Hunter\'s Moon' },
    { date: '2024-11-15', name: 'Beaver Moon' },
    { date: '2024-12-15', name: 'Cold Moon' }
]

function getNextFullMoon() {
    const now = moment();
    const nextFullMoon = fullMoons.find(moon => moment(moon.date).isAfter(now));
    return nextFullMoon;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('moon')
		.setDescription('Find when the next full moon is.'),
	async execute(interaction) {
        const message = `The next full moon is the ${getNextFullMoon().name} on ${moment(getNextFullMoon().date).format('MMMM Do, YYYY')}.`;
		await interaction.reply(message);
	},
};