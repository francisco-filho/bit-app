const express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
const https = require('https');

//const HG_KEY="18837869"
const HG_KEY="346f6c2f"
const MOEDAS_URL = `https://api.hgbrasil.com/finance?format=json-cors&key=${HG_KEY}`
//const MOEDAS_URL="http://68.183.139.142:3001/api/cotacoes";
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(pino);

let cotacoes = {}

setInterval(queryApi, 1000 * 60 * 10)
queryApi()

app.get('/api/cotacoes', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(cotacoes);
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