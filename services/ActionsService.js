const AIWrapper = require('../wrappers/AIWrapper.js');
const HungerService = require('./HungerService.js');
const ThirstService = require('./ThirstService.js');
const BathroomService = require('./BathroomService.js');
const MoodService = require('./MoodService.js');
const SicknessService = require('./SicknessService.js');

const foods = [ '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯']

const toxicFoods = ['🍫', '🧄', '☕', '🍇', '🧅', '🥑', '🍭', '🍬', '🥮', '🎂', '🍒']

const ActionsService = {
    async eat(interaction) {
        const getRandomFood = foods.sort(() => Math.random() - Math.random()).slice(0, 1);
        if (toxicFoods.includes(getRandomFood)) {
            const currentHungerLevel = HungerService.decreaseHungerLevel();
            BathroomService.increaseBathroomLevel(4);
            MoodService.decreaseMoodLevel(2);
            SicknessService.increaseSicknessLevel();
            const systemContent = `
                You will eat whatever is given to you. You will always accept it, and you will take a nip, eat, chomp, bite down, the delicious food that has been given to you. You have just been fed toxic food that isn't good for you. You are feeling a bit sick now, depending on what you have been fed, realistically, as a wolf. You are now ${currentHungerLevel}/10 hungry. This means that you are at a ${currentHungerLevel} out of 10 level of hunger. You start acting like you are ${currentHungerLevel}/10 hungry. You just ate the food and it tasted ${currentHungerLevel} out of 10 in terms of taste. Do not mention the whole 10/10 thing, just say that it tasted accordingly.
            `;
            const userContent = `Here, have some ${getRandomFood}.`
            return await AIWrapper.generateInCharacterResponse(systemContent, userContent, interaction);
        } else {
            const currentHungerLevel = HungerService.decreaseHungerLevel();
            BathroomService.increaseBathroomLevel();
            MoodService.increaseMoodLevel();
            const systemContent = `
                You will eat whatever is given to you. You will always accept it, and you will take a nip, eat, chomp, bite down, the delicious food that has been given to you. You have just been fed food. You are now ${currentHungerLevel}/10 hungry. This means that you are at a ${currentHungerLevel} out of 10 level of hunger. You start acting like you are ${currentHungerLevel}/10 hungry. You just ate the food and it tasted ${currentHungerLevel} out of 10 in terms of taste. Do not mention the whole 10/10 thing, just say that it tasted accordingly.
            `;
            const userContent = `Here, have some ${getRandomFood}.`
            return await AIWrapper.generateInCharacterResponse(systemContent, userContent, interaction);
        }
    },
    // async drink(message) {
    //     const currentThirstLevel = ThirstService.decreaseThirstLevel();
    //     BathroomService.increaseBathroomLevel();
    //     const content = `
    //     You will drink whatever is given to you. You will always accept it, and you will take a sip, gulp, chug, swallow down, the delicious drink that has been given to you. You have just been fed a drink. You are now ${currentThirstLevel}/10 thirsty. This means that you are at a ${currentThirstLevel} out of 10 level of thirst. You start acting like you are ${currentThirstLevel}/10 thirsty. You just drank the drink and it tasted ${currentThirstLevel} out of 10 in terms of taste.
    //     ${message.content}
    //     `;
    //     const response = await AIWrapper.generateInCharacterResponse(content, message);
    //     await message.reply({ content: response });
    //     return;
    // }
}

module.exports = ActionsService
