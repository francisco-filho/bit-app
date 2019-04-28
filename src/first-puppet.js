const puppeteer = require('puppeteer-core');

const wsChrome = "ws://127.0.0.1:9222/devtools/browser/BF56CC4B611C3645A5D15130F302608B";

// const wsChrome = "ws://127.0.0.1:9222/devtools/page/185456E13D3510004C864F249A10568F";
(async () => {
/*  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  });*/
  const browser = await puppeteer.connect({
    browserWSEndpoint: wsChrome
  })
  //const page = await browser.newPage();
  //page.setViewport({width: 1400, height: 800})
  await page.goto('https://broker.batexchange.com.br/usuario/privado/dashboard');

/*  await page.type('#ctl00_ContentPlaceHolder1_TextBoxLogin', 'francisco@capimgrosso.com')
  await page.type('#ctl00_ContentPlaceHolder1_TextBoxSenha', '!fms03gdA')
  await page.waitForSelector('.recaptcha-checkbox-checkmar')
  await page.click('.recaptcha-checkbox-checkmark')*/


  //await browser.close();
})();