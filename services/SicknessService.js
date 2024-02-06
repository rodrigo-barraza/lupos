let sicknessLevel = 0;

const SicknessService = {
    getSicknessLevel() {
        return sicknessLevel;
    },
    setSicknessLevel(level) {
        sicknessLevel = level;
    },
    increaseSicknessLevel() {
        let currentSicknessLevel = SicknessService.getSicknessLevel();
        currentSicknessLevel = currentSicknessLevel < 100 ? currentSicknessLevel + 10 : 100
        SicknessService.setSicknessLevel(currentSicknessLevel);
        console.log(`Sickness level increased to: ${currentSicknessLevel}`);
        return currentSicknessLevel;
    },
    decreaseSicknessLevel() {
        let currentSicknessLevel = SicknessService.getSicknessLevel();
        currentSicknessLevel = currentSicknessLevel > 0 ? currentSicknessLevel - 10 : 0;
        SicknessService.setSicknessLevel(currentSicknessLevel);
        console.log(`Sickness level decreased to: ${currentSicknessLevel}`);
        return currentSicknessLevel;
    }
}

module.exports = SicknessService
