const express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
const https = require('https');

//const HG_KEY="18837869"
const HG_KEY="346f6c2f"
const MOEDAS_URL = `https://api.hgbrasil.com/finance?format=json-cors&key=${HG_KEY}`
const BINANCE_API = "https://api.binance.com/api/v3/ticker/price";
const BINANCE_SYMBOL = {BTC_USDC: 'BTCUSDC', ETH_USDC: 'ETHUSDC', ETH_BTC: 'ETHBTC'}

//const MOEDAS_URL="http://68.183.139.142:3001/api/cotacoes";
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(pino);

let cotacoes = {}
let binanceData = []

let queryApiInterval = setInterval(queryApi, 1000 * 60 * 15)
let binanceApiInterval = setInterval(binanceApi, 1000 * 15 * 1)

queryApi()
binanceApi()

app.get('/api/cotacoes', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(cotacoes);
});

app.get('/api/binance', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(binanceData);
});

app.listen(3001, () =>
  console.log('Express server is running on localhost:3001')
);

function queryApi(){
  console.log('quering')
  return https.get(MOEDAS_URL, (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      console.log(data)
      cotacoes = data;
    });

  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}

function binanceApi(){
  return https.get(BINANCE_API, (resp) => {
    const RATE_LIMIT_EXCEEDED = 429;
    const IP_BANNED = 418;


    if (resp.statusCode == RATE_LIMIT_EXCEEDED || resp.statusCode == IP_BANNED){
      const retryAfter = resp.headers['retry-after'] ? parseInt(resp.headers['retry-after']) * 1000 : 30000;
      clearInterval(binanceApiInterval);
      setTimeout(() => binanceApiInterval = setInterval(binanceApi, 1000 * 15 * 1), retryAfter);
      return;
    }

    let data = '';

    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      binanceData = data;
    });

  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}
