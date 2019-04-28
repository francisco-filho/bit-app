/**
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author ebidel@ (Eric Bidelman)
 */

/**
 * How to:
 * 1. Use chrome-launcher module to launch chrome
 * 2. Connect to that browser instance using Puppeteer.
 * 3. Run Lighthouse on the page.
 */

//"c:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --log-level=info output=json --user-data-dir=remote-profile

const chromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');
const request = require('request');
const util = require('util');

(async() => {

const URL = 'https://www.chromestatus.com/features';

const opts = {
  // chromeFlags: ['--headless'],
  chromeFlags: [],
  logLevel: 'info',
  output: 'json'
};

// Launch chrome using chrome-launcher.
//const chrome = await chromeLauncher.launch(opts);
//opts.port = chrome.port;

// Connect to it using puppeteer.connect().
const resp = await util.promisify(request)(`http://localhost:9222/json/version`);
const {webSocketDebuggerUrl} = JSON.parse(resp.body);
const browser = await puppeteer.connect({browserWSEndpoint: webSocketDebuggerUrl});

const pages = await browser.pages();
page = pages[0]
page.setViewport({width: 1024, height: 800})
await page.goto('https://broker.negociecoins.com.br/usuario/privado/retirada');
//const valor = await page.$('#')
await sleep(3000)
const awaitValueQuery = 'document.getElementById("ctl00_ContentPlaceHolder1_LiteralLimiteDisponivel").innerHTML'
await page.waitForFunction(awaitValueQuery +' == "0,00"');
await page.waitForSelector('#ctl00_ContentPlaceHolder1_TextBoxValorRetirada');

await sleep(2000)
// checar se modal apareceu

await page.select("select[name='ctl00$ContentPlaceHolder1$DropDownListUsuarios_ContaBancaria']", '103223')

await sleep(2000)

await page.evaluate(() => {
  const el = document.querySelector("#ctl00_ContentPlaceHolder1_limitesUsuario a")
  el.parentElement.click();
  const saldo = document.querySelector('#ctl00_ContentPlaceHolder1_LiteralLimiteDisponivel').innerHTML
  console.log('end');
  UseBalanceParaRetirada(saldo);
  $("#ctl00_ContentPlaceHolder1_TextBoxValorRetirada").val(saldo);
  CalculaComissao();
});
await sleep(2000)
// se der erro dá alert alert-danger
await page.evaluate(() => $('#aEnviar').click());

/*await page.waitForSelector('.recaptcha-checkbox-checkmar')
await page.click("#ctl00_liLivroOfertas > a")*/
//await page.goto('https://broker.batexchange.com.br/usuario/privado/dashboard');
// Run Lighthouse.

})();


function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(time) {
  await timeout(time);
  return true;
}