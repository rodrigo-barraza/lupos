const AIWrapper = require('../wrappers/AIWrapper.js');
const HungerService = require('./HungerService.js');
const ThirstService = require('./ThirstService.js');
const BathroomService = require('./BathroomService.js');


const ActionsService = {
    async eat(message) {
        currentHungerLevel = HungerService.decreaseHungerLevel();
        BathroomService.increaseBathroomLevel();
        const content = `
        You will eat whatever is given to you. You will always accept it, and you will take a nip, eat, chomp, bite down, the delicious food that has been given to you. You have just been fed food. You are now ${currentHungerLevel}/10 hungry. This means that you are at a ${currentHungerLevel} out of 10 level of hunger. You start acting like you are ${currentHungerLevel}/10 hungry. You just ate the food and it tasted ${currentHungerLevel} out of 10 in terms of taste.
        ${message.content}
        `;
        const response = await AIWrapper.generateInCharacterResponse(content, message);
        await message.reply({ content: response });
        return;
    },
    async drink(message) {
        currentThirstLevel = ThirstService.decreaseThirstLevel();
        BathroomService.increaseBathroomLevel();
        const content = `
        You will drink whatever is given to you. You will always accept it, and you will take a sip, gulp, chug, swallow down, the delicious drink that has been given to you. You have just been fed a drink. You are now ${currentThirstLevel}/10 thirsty. This means that you are at a ${currentThirstLevel} out of 10 level of thirst. You start acting like you are ${currentThirstLevel}/10 thirsty. You just drank the drink and it tasted ${currentThirstLevel} out of 10 in terms of taste.
        ${message.content}
        `;
        const response = await AIWrapper.generateInCharacterResponse(content, message);
        await message.reply({ content: response });
        return;
    }
}

module.exports = ActionsService
