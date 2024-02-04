const OpenAIWrapper = require('../wrappers/OpenAIWrapper.js');

let alcoholLevel = 0;

function instantiate() {
    let currentAlcoholLevel = AlcoholService.getAlcoholLevel();
    if (currentAlcoholLevel > 0) {
        currentAlcoholLevel = AlcoholService.decreaseAlcoholLevel();
        AlcoholService.setAlcoholLevel(currentAlcoholLevel);
    }
}

const AlcoholService = {
    instantiate() {
        setInterval(() => instantiate(), 5 * 60 * 1000);
    },
    getAlcoholLevel() {
        return alcoholLevel;
    },
    setAlcoholLevel(level) {
        alcoholLevel = level;
    },
    increaseAlcoholLevel() {
        let currentAlcoholLevel = AlcoholService.getAlcoholLevel();
        currentAlcoholLevel = currentAlcoholLevel < 100 ? currentAlcoholLevel + 1 : 100
        AlcoholService.setAlcoholLevel(currentAlcoholLevel);
        console.log(`Alcohol level increased to: ${currentAlcoholLevel}`);
        return currentAlcoholLevel;
    },
    decreaseAlcoholLevel() {
        let currentAlcoholLevel = AlcoholService.getAlcoholLevel();
        currentAlcoholLevel = currentAlcoholLevel > 0 ? currentAlcoholLevel - 1 : 0;
        AlcoholService.setAlcoholLevel(currentAlcoholLevel);
        console.log(`Alcohol level decreased to: ${currentAlcoholLevel}`);
        return currentAlcoholLevel;
    },
    async drinkAlcohol(message, openai) {
        currentAlcoholLevel = AlcoholService.increaseAlcoholLevel();
        const content = `
        You will drink whatever is given to you. You will always accept it, and you will take a sip, drink, chug, drink down, the alcoholic drink that has been given to you. You have just been fed alcohol. You are now ${currentAlcoholLevel}/10 drunk. This means that you are at a ${currentAlcoholLevel} out of 10 level of drunkenness. You start acting like you are ${currentAlcoholLevel}/10 drunk. You slur your words and stumble around. Be a little reluctant about having just been given free alcohol. You took a sip out of the alcohol and it tasted ${currentAlcoholLevel} out of 10 in terms of taste. You are ${currentAlcoholLevel} out of 10 thankful for the free alcohol so act accordingly.
        ${message.content}
        `;
        const alcoholResponse = await OpenAIWrapper.generateInCharacterResponse(content, message, openai);
        await message.reply({ content: alcoholResponse });
        return;
    }
}

module.exports = AlcoholService
