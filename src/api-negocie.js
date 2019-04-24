const crypto = require('crypto');
const request = require('request');

//const API_ID="7662ae639f77418cacca7470e3e52e6a";
//const API_SECRET="FSsZRV4QktO7UVzwFj1U+vEQIoqazgYtgXhSiu+Ufnc=";
const API_ID="003fd0dff87a494dad6ef0d5f453e2ea";
const API_SECRET="EFcCVHlZ8TyrpRf7UPt3Yf5q1MfP9DNo1W7Hl61AwLA=";
const timestamp = parseInt(new Date().getTime() / 1000);
const nonce = parseInt(random(0, 100000000));
const baseURL = "https://broker.tembtc.com.br/tradeapi/v1/user/balance"
const url =  encodeURIComponent(baseURL).toLowerCase()

const body = Buffer.from("{}").toString('base64')
const signatureRawData = [API_ID, 'GET', url, timestamp, nonce, ''].join('')

const signature = computeSignature(signatureRawData, API_SECRET)

const header = 'amx ' + [API_ID, signature, nonce, timestamp].join(':')

function computeSignature(data, secret){
  /*
  SecretKey secretKey = null;
  byte[] keyBytes = decodeBase64(secret);
  //Faz-se a criptografia da chave da API no formato HMACSHA256
  secretKey = new SecretKeySpec(keyBytes, "HmacSHA256");
  Mac mac = Mac.getInstance("HmacSHA256");
  mac.init(secretKey);
  byte[] text = data.getBytes();
  //Faz-se o encode em base 64 com Hash MAC e os dados, e retorna para ser usado em requestSignatureBase64String
  return new String(encodeBase64(mac.doFinal(text))).trim();
  */
  //const data1 = "7662ae639f77418cacca7470e3e52e6aGEThttps%3a%2f%2fbroker.negociecoins.com.br%2ftradeapi%2fv1%2fuser%2fbalance155605857053336071".toString('utf-8')
  const data1 = data
  keyBytes = Buffer.from(secret, 'base64')
  const hmac = crypto.createHmac('sha256', keyBytes);
  hmac.update(data1)
  b64 = hmac.digest()
  return Buffer.from(b64).toString('base64')
}

function random(low, high) {
  return Math.random() * (high - low) + low
}

const headers = {
  'Authorization': header,
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:25.0) Gecko/20100101 Firefox/25.0',
  'Content-Type': 'application/json'
}

request({url:baseURL, headers: headers}, (err, r, body) => {
  console.log('headers', headers)
      if (err)
        console.log(err)
    console.info('body', body)
})
