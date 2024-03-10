require('dotenv/config');
const puppeteer = require('puppeteer');

const PuppeteerWrapper = {
    async scrapeGoogleAlerts(searchText) {
        let result;
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://www.google.com/alerts');

        try {
            await page.type('input[type="text"]', searchText);
            await page.waitForSelector('li.result');


            result = await page.evaluate(() => {
                const noRecentResults = document.querySelector('.preview_timerange_extended');
                if (!noRecentResults) {
                    const firstResultSet = document.querySelector('#preview_results .result_set');
                    if (!firstResultSet) return [];
                    const listItems = firstResultSet.querySelectorAll('li.result');
                    return Array.from(listItems, element => {
                        const title = element.querySelector('h4 a').textContent.trim();
                        const description = element.querySelector('div span').textContent.trim();
                        return { title, description };
                    });
                }
            });

        } catch(error) {
            console.error('Puppeteer Error:\n', error);
            result = null;
        }
        
        await browser.close();
        console.log(result);
        return result;
    },
};

module.exports = PuppeteerWrapper;