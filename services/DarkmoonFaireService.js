const { ActivityType } = require('discord.js');
const OpenAIWrapper = require('../wrappers/OpenAIWrapper.js');
const DiscordWrapper = require('../wrappers/DiscordWrapper.js');
const moment = require('moment')

const DarkmoonFaireService = {
    getNextFaire() {
        const now = moment();
        const nextFaire = moment().startOf('month').day('Sunday').add(7, 'days');
        if (nextFaire.isBefore(now)) {
            nextFaire.add(1, 'month');
        }
        return nextFaire;
    },
    daysUntilFaire() {
        const nextFaire = this.getNextFaire();
        const daysUntilFaire = moment(nextFaire).startOf('day').diff(moment().startOf('day'), 'days');
        return daysUntilFaire;
    },
    getFaireFromToDates() {
        const nextFaire = this.getNextFaire();
        const faireFrom = nextFaire.subtract(7, 'days').format('MMMM Do, YYYY');
        const faireTo = nextFaire.format('MMMM Do, YYYY');
        return { faireFrom, faireTo };
    },
    getCurrentFaireFromToDates() {
        const now = moment();
        const firstSundayWeekStart = moment().startOf('month').day('Sunday');
        const firstSundayWeekEnd = moment(firstSunday).add(7, 'days');
        const faireFrom = firstSundayWeekStart.format('MMMM Do, YYYY');
        const faireTo = firstSundayWeekEnd.format('MMMM Do, YYYY');
        return { faireFrom, faireTo };
    },
    isItCurrentFaireWeek() {
        const now = moment();
        const firstSundayWeekStart = moment().startOf('month').day('Sunday');
        const firstSundayWeekEnd = moment(firstSunday).add(7, 'days');
        if (now.isBetween(firstSundayWeekStart, firstSundayWeekEnd)) {
            return true;
        }
        return false;
    },
    darkmoonFaireMessage(interaction) {
        const isItCurrentFaireWeek = DarkmoonFaireService.isItCurrentFaireWeek();
        const getCurrentFaireFromToDates = DarkmoonFaireService.getCurrentFaireFromToDates();
        let systemContent = '';
        if (isItCurrentFaireWeek) {
            systemContent = `
                You will enclose the date and word today in double **asterisks**.
                You will include the word today in the response.
                You will answer in character, that it's currently Darkmoon Faire week, which started on ${getCurrentFaireFromToDates.faireFrom} and will go on until ${getCurrentFaireFromToDates.faireTo} . You will make a remark about how they should go there to fuck up the other faction in some sweaty pvp that only the most elite nerds engage in.
            `
        } else {
            const nextResetDate = DungeonTimerService.getNextBFDResetDate().format('MMMM Do, YYYY');
            systemContent = `
                You will enclose the day, date and tomorrow or after tomorrow in double **asterisks**.
                Mention whether it's tomorrow or the day after tomorrow.
                You will answer, in character, when the next raid reset is. The next raid reset date is in ${daysUntilReset} days, on ${nextResetDate}. You will either answer by saying the date, and by saying how many more hours are left until the next dungeon reset. Make a remark about how they they seem to be so impatient and that they should probably go out a little more, instead of playing silly nintendo indoors, all locked up, like a pup in a cage, or a dog in a crate.
                
                Do not mention the time at all, only the date.
            `;
        }
        const userContent = 'When is the next raid reset date? I cannot wait to throw myself in a raid again. I am so excited!';
        return await OpenAIWrapper.generateInCharacterResponse2(systemContent, userContent, interaction);
    },
}

module.exports = DarkmoonFaireService
