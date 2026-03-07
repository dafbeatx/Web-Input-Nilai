const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('api')) {
      console.log('API Request:', request.url());
    }
    request.continue();
  });
  
  await page.goto('https://mangahook.vercel.app', { waitUntil: 'networkidle2' });
  await browser.close();
})();
