const { ActivityType } = require('discord.js');
const AIWrapper = require('../wrappers/AIWrapper.js');
const DiscordWrapper = require('../wrappers/DiscordWrapper.js');

const worldOfWarcraftHolidays = [
    {
        name: "Hallow's End",
        fromDate: "October 18th",
        toDate: "November 1st",
        description: "Hallow's End is a celebration of the break between the Forsaken and the Scourge. Many tricks and treats await adventurers seeking holiday fun, including the Headless Horseman's haunted lair."
    },
    {
        name: "Winter Veil",
        fromDate: "December 16th",
        toDate: "January 2nd",
        description: "The Feast of Winter Veil is a festive time of year"
    },
    {
        name: "Lunar Festival",
        fromDate: "January 24th",
        toDate: "February 7th",
        description: "The Lunar Festival is a time of celebration for the peoples of Azeroth. It is a time of remembrance for the fallen heroes of the past and a time of celebration for the heroes of the present."
    },
    {
        name: "Love is in the Air",
        fromDate: "February 8th",
        toDate: "February 22nd",
        description: "Love is in the Air is in the air in the major cities of Azeroth! New holiday attire, quests, and more are available."
    },
    {
        name: "Noblegarden",
        fromDate: "April 5th",
        toDate: "April 12th",
        description: "The great feast of Noblegarden has long been celebrated"
    },
    {
        name: "Children's Week",
        fromDate: "May 3rd",
        toDate: "May 10th",
        description: "The celebration of Children's Week begins in the capital cities of Azeroth and in Shattrath. It is a time for the heroes of the Horde and the Alliance to give back to the innocents of war-torn Azeroth."
    },
    {
        name: "Midsummer Fire Festival",
        fromDate: "June 21st",
        toDate: "July 5th",
        description: "The Midsummer Fire Festival is a time of merriment and festivities, and the hottest season of the year."
    },
    {
        name: "Pirate's Day",
        fromDate: "September 19th",
        toDate: "September 20th",
        description: "Pirates have invaded the coasts of Azeroth and Northrend, and they are not leaving until they get what they want. The only way to get rid of them is to give them what they want."
    },
    {
        name: "Brewfest",
        fromDate: "September 20th",
        toDate: "October 6th",
        description: "Brewfest is a time to celebrate the harvest and to show appreciation for the fine beverages Azeroth has to offer!"
    },
    {
        name: "Harvest Festival",
        fromDate: "September 29th",
        toDate: "October 6th",
        description: "The Harvest Festival is a time to commemorate those who have sacrificed their lives to help friends and allies."
    },
    {
        name: "Day of the Dead",
        fromDate: "November 1st",
        toDate: "November 3rd",
        description: "The Day of the Dead is a time to remember the fallen heroes of the Horde and Alliance."
    },
    {
        name: "Pilgrim's Bounty",
        fromDate: "November 21nd",
        toDate: "November 27th",
        description: "Pilgrim's Bounty is a time to reflect upon one's good fortune and share with all around you."
    },
]

const HolidayService = {
}

module.exports = HolidayService
