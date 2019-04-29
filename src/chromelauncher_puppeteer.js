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

  const opts = {
    // chromeFlags: ['--headless'],
    chromeFlags: [],
    logLevel: 'info',
    output: 'json'
  };

  //Launch chrome using chrome-launcher.
  //const chrome = await chromeLauncher.launch(opts);
  //opts.port = chrome.port;

  const resp = await util.promisify(request)(`http://localhost:9222/json/version`);
  const {webSocketDebuggerUrl} = JSON.parse(resp.body);
  const browser = await puppeteer.connect({browserWSEndpoint: webSocketDebuggerUrl});

  const pages = await browser.pages();
  page = pages[0]
  page.setViewport({width: 1280, height: 800})
  //await page.goto('https://broker.negociecoins.com.br/usuario/privado/retirada');
  await page.goto('https://broker.tembtc.com.br/usuario/privado/retirada');
  await sleep(3000)

  // seção da TEMBTC
  // tembtcIrParaSecaoRetiradaBitcoin(page)

  // checar se modal apareceu
  await sleep(3000)
  await esperarModalEFechaLa(page, 2000)

  // espera até valor da retirada ser != "0,00"
  esperarValorDaRetiradaSerPreenchido(page)


  // seleciona transferência para Bat
  await sleep(2000)
  await page.select("select[name='ctl00$ContentPlaceHolder1$DropDownListUsuarios_ContaBancaria']", '103223')

  // executa função para calculo da comissão e valor liquido
  await sleep(5000)
  await page.evaluate(() => {
    const el = document.querySelector("#ctl00_ContentPlaceHolder1_limitesUsuario a")
    el.parentElement.click();
    const saldo = document.querySelector('#ctl00_ContentPlaceHolder1_LiteralLimiteDisponivel').innerHTML
    // UseBalanceParaRetirada(saldo);
    $("#ctl00_ContentPlaceHolder1_TextBoxValorRetirada").val(saldo);
    CalculaComissao();
  });

  // Solicita retirada
  await solicitar(page)

  //TODO: se der erro dá alert alert-danger

  await informarPIN(page)

  await page.disconnect()

// DIV de erro apos transf: div.alert.alert-danger
//  .retirada-panel .alert.alert-success
})();

const tembtcIrParaSecaoRetiradaBitcoin = async (page) => {
  const btnBitcoin = await page.waitForSelector('#ctl00_ContentPlaceHolder1_RepeaterMoedas_ctl01_ButtonMoeda');
  await btnBitcoin.click()
}

const esperarValorDaRetiradaSerPreenchido = async (page) => {
  await page.waitForSelector('#ctl00_ContentPlaceHolder1_TextBoxValorRetirada');
  const awaitValueQuery = 'document.getElementById("ctl00_ContentPlaceHolder1_LiteralLimiteDisponivel").innerHTML'
  await page.waitForFunction(awaitValueQuery +' != "0,00"');
}

const solicitar = async (page) => {
  await sleep(2000)
  await page.evaluate(() => $('#aEnviar').click());
}

const informarPIN = async (page) => {
  await page.waitForSelector('#divRetirada #ctl00_ContentPlaceHolder1_TextBoxPIN');
  await sleep(2000)
  await page.focus('#ctl00_ContentPlaceHolder1_TextBoxPIN')
  await page.type('#divRetirada #ctl00_ContentPlaceHolder1_TextBoxPIN', '8564', {delay: 200})
  await page.evaluate(() => $('#divRetirada input[name="ctl00$ContentPlaceHolder1$Continuar"]').click())
}

const esperarModalEFechaLa = async (page, timeout) => {
  let closeModalButton = null;
  try {
    closeModalButton = await page.waitForSelector('.modal-footer .btn.btn-default', {timeout})
  } catch (e) {
    closeModalButton = null
    return false
  }

  if (closeModalButton){
    closeModalButton.click()
    return true
  }
}


function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(time) {
  await timeout(time);
  return true;
}