import React, { Component } from 'react';
import './App.css';
import {get} from './util/http'
import 'whatwg-fetch'
import classNames from "classnames";
import range from 'lodash/range'

const TEMBTC_URL = "https://broker.tembtc.com.br/api/v3/btcbrl/ticker"
const TEMETH_URL = "https://broker.tembtc.com.br/api/v3/ethbtc/ticker"
const NEGOCIE_URL = "https://broker.negociecoins.com.br/api/v3/btcbrl/ticker"
const NEGOCIE_LIVRO_URL = "https://broker.negociecoins.com.br/api/v3/btcbrl/orderbook"
const TEM_ETH_LIVRO_URL = "https://broker.tembtc.com.br/api/v3/btceth/orderbook"

const BAT_URL = "https://broker.batexchange.com.br/api/v3/brleth/ticker"
const POLONIEX = "https://poloniex.com/public?command=returnTicker"
const MOEDAS_URL="http://www.capimgrosso.com:3001/api/cotacoes";
//const MOEDAS_URL="http://68.183.139.142:3001/api/cotacoes";
const PCT_CONVERSAO = 1.0315;
const GOOGLE_CLIENT_ID="1098141721569-72hg5nhpa0donvdevu0i58466dg4ph7f.apps.googleusercontent.com";
const TAXA_CONVERSAO_TEMBTC = 1.016505023832982;

const DOLAR = 3.9791;

const saveToStorage = (key, value) => localStorage.setItem(key, value)
const getFromStorage = (key, defaultValue) => {
  const value = localStorage.getItem(key)
  return !value && typeof defaultValue != 'undefined' ? defaultValue : value
}



class App extends Component {
  state = {
    bat: {sell: 0 , buy: 0},
    tembtc: {sell: 0 , buy: 0},
    temeth: {sell: 0 , buy: 0},
    negocie: {sell: 0 , buy: 0},
    capital: getFromStorage('capital', 16000),
    atualizacao: new Date(),
    dolar: DOLAR,
    venda: 0,
    vendaBtc: 0,
    atualizando: false,
    cotacaoExternaBTC_ETH: 0,
    cotacaoDolar: 0,
    cotacaoEthDolar: 0,
    cotacoesExternas: {},
    pctConversao: getFromStorage('pctConversao', PCT_CONVERSAO),
    alertaETH: false,
    volume: 0,
    quantidade: 0,
    volumeCompra: 0,
    quantidadeCompra: 0,
    diffTembtc: 0,
    valorPassiva: 0,
    erroTembtc: false,
    erroTemeth: false,
    erroNegocie: false
  }

  valores = range(120).map( v => v * 1000 + 10000)

  componentDidMount() {
    this.interval = setInterval(this.atualizarCotacoes, 3000)
    this.intervalPoly = setInterval(this.atualizarCotacaoExterna, 1000 * 20 * 1)
    this.intervalDolar = setInterval(this.atualizarCotacaoDolar, 1000 * 60 * 2)
    this.intervalLivro = setInterval(this.atualizarLivros, 1000 * 5)
    this.atualizarCotacaoDolar()
    this.atualizarLivros()
    setTimeout(this.atualizarCotacaoExterna, 2000)
    if (this.noDominio()) {
      initGoogle(auth => console.log(auth));
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval)
    clearInterval(this.intervalPoly)
    clearInterval(this.intervalDolar)
    clearInterval(this.intervalLivro)
  }

  noDominio = () => window.location.href.indexOf('capimgrosso') >= 0

  usuarioLogado = () => {
    if (!this.noDominio())
      return true;
    try {
      const l = window.gapi.auth2.getAuthInstance().isSignedIn.get()
      return l;
    } catch (e) {
      return false;
    }
  }

  atualizarCotacaoDolar = () => {
    get(MOEDAS_URL).then(resp => {
      const dolar = resp.results.currencies.USD.buy
      this.setState({dolar})
    }).catch(error => this.setState({dolar: DOLAR}))
  }

  atualizarCotacaoExterna = () => {
      get(POLONIEX).then(resp => resp).then(resp => {
        if (resp)
          this.setState({
            cotacaoDolar: resp.USDC_BTC,
            cotacaoEthDolar: resp.USDC_ETH,
            cotacaoExternaBTC_ETH: resp.BTC_ETH,
            cotacoesExternas: resp
          })
      })
  }

  atualizarLivros = () => {
    const {negocie, temeth} = this.state

    get(NEGOCIE_LIVRO_URL).then(resp => {
      if (!negocie) return
      const livro = this.volumeLivroNegocie(resp, negocie.buy)
        this.setState({
          volume: livro.volume,
          quantidade: livro.quantidade,
          volumeCompra: livro.volumeCompra,
          quantidadeCompra: livro.quantidadeCompra
        })
    })

    get(TEM_ETH_LIVRO_URL).then(resp => {
      if (!negocie) return
      const livro = this.volumeLivroNegocie(resp, temeth.buy)
      this.setState({
        volumeEth: livro.volume,
        quantidadeEth: livro.quantidade,
        volumeCompraEth: livro.volumeCompra,
        quantidadeCompraEth: livro.quantidadeCompra
      })
    })
  }

  atualizarCotacoes = () => {
    const {capital, venda, vendaBtc} = this.state
    const diffAnterior = this.state.diffTembtc
    this.setState({atualizando: true})
    Promise.all([
      get(TEMBTC_URL).then(resp => resp).catch(e => null),
      get(TEMETH_URL).then(resp =>  resp).catch(e => null),
      get(NEGOCIE_URL).then(resp => resp).catch(err => null),
      get(BAT_URL).then(resp => resp),
    ]).then(resp => {
      const result = {
        tembtc: resp[0],
        temeth: resp[1],
        negocie: resp[2],
        bat: resp[3],
      }

      let vendaBtc = result.temeth && result.temeth.buy ? result.temeth.buy : vendaBtc
      let venda = result.negocie && result.negocie.buy ? parseFloat(result.negocie.buy) : venda

      let vlrCompra = capital / result.bat.sell
      let vlrVendaBtc  = vlrCompra * vendaBtc
      let vlrVenda = vlrVendaBtc * venda
      const taxas = (vlrVenda * 0.01975) + (0.0003 * venda)
      const lucroBat = (vlrVenda - capital) - taxas
      const pctBat = (lucroBat / capital) * 100

      const diffTembtc = venda - result.tembtc.sell;
      let valorPassiva = venda
      const calcDiff = (anterior, atual) => anterior - atual

      // verifica se a diferença está diminuindo, o que é sinal de aumento da contação
      if ((diffTembtc + 1) < diffAnterior){
        let mudanca = calcDiff(diffAnterior, diffTembtc);
        valorPassiva = result.tembtc.sell * TAXA_CONVERSAO_TEMBTC;
        saveToStorage('valorPassiva', valorPassiva)
      }

      this.setState({...result, lucroBat, pctBat, atualizacao: new Date(),
        venda,
        vendaBtc,
        diffTembtc,
        valorPassiva,
        erroTemeth: !(!!resp[1]),
        erroNegocie: !(!!resp[2]),
        atualizando: false})
    })
  }

  limparValorPassiva = () => saveToStorage('valorPassiva', 0)

  volumeLivroNegocie = (livro, valor) => {
    let result = {
      volume: 0,
      quantidade: 0,
      volumeCompra: 0,
      quantidadeCompra: 0
    }
    if (livro && livro.bid) {
      let livroValorMaximo = livro.bid.splice(0, 50).filter( l => l.price === valor)
      let volume = livroValorMaximo.reduce((o, n) => o + n.quantity, 0)
      result.volume = volume
      result.quantidade = livroValorMaximo.length
    }
    if (livro && livro.ask) {
      let livroCompra = livro.ask.splice(0, 100).filter( l => l.price <= valor)
      let volumeCompra = livroCompra.reduce((o, n) => o + n.quantity, 0)
      result.volumeCompra = volumeCompra
      result.quantidadeCompra = livroCompra.length
    }
    return result
  }

  handleCapitalChange = (e) => {
    const value = e.target.value
    this.setState({capital: value}, () => {
      saveToStorage('capital', value)
      this.atualizarCotacoes()
      this.atualizarCotacaoExterna()
    })
  }
  handleVendaChange = (e) => this.setState({venda: parseInt(e.target.value)})

  handleVendaBtcChange = (e) => this.setState({vendaBtc: e.target.value})

  getColor = (pct) => {
    const colors = {
      ruim: '#f00',
      normal: "#ccc",
      bom: '#ffd70a',
      otimo: '#20b020',
      magnifico: '#9400a5',
    }

    if (pct < .05){
      return colors.ruim
    } else
    if (pct < .30){
      return colors.normal
    } else
    if (pct < .50){
      return colors.bom
    } else
    if (pct < .70){
      return colors.otimo
    } else
      return colors.magnifico
  }

  percentualAplicado = (cotacaoExterna, cotacao) => (cotacao - cotacaoExterna) / cotacaoExterna

  updatePctConversao = (cotacao) => {
    const {dolar, venda} = this.state
    const value =  parseFloat(1 + this.percentualAplicado(cotacao * dolar, venda)).toFixed(4)
    saveToStorage('pctConversao', value)
    this.setState({pctConversao: value})
  }

  format = (numero, moeda=false) => {
    if (typeof numero === 'undefined')
      return null;
    const style = moeda ? {style: 'currency', currency: 'BRL'} : {}
    return numero.toLocaleString('pt-BR', {...style, maximumFractionDigits: 2, minimumFractionDigits: 2})
  }

  render() {
    const {cotacaoDolar,
        cotacaoEthDolar,
        venda,
        tembtc,
        temeth,
        negocie,
        bat,
        capital,
        lucroBat,
        pctBat,
        dolar,
        cotacaoExternaBTC_ETH,
        cotacoesExternas,
        pctConversao,
        volume,
        vendaBtc,
        quantidade,
        erroNegocie,
        erroTemeth,
        volumeCompra,
        volumeEth,
        volumeCompraEth,
        diffTembtc

      } = this.state

    if (!temeth.buy && !negocie.buy && !cotacaoExternaBTC_ETH){
      return null
    }

    const alertaETH = temeth.buy >= parseFloat((""+cotacaoExternaBTC_ETH.last).substr(0, 6)) + 0.0003
    const alertaBTC = (venda - (cotacaoDolar.last * dolar * pctConversao)) > 50;
    const sugestao = cotacaoDolar.last * dolar * pctConversao;

    let valorPassiva = getFromStorage('valorPassiva');
    if (valorPassiva){
      try {
        valorPassiva = parseFloat(valorPassiva)
      } catch (e) {
        valorPassiva = 0
      }
    } else {
      valorPassiva = 0
    }

    const alertaPassiva = valorPassiva > venda && pctBat < 0.20;

    return (this.usuarioLogado() ? (
      <div className="App">

        <div className="mensagens">
          { erroTemeth && <MensagemErro mensagem="API TEMBTC / ETH com problemas"/>}
          { erroNegocie && <MensagemErro mensagem="API NEGOCIE com problemas"/>}
        </div>
        <header><span>ROI Aproximado</span>
        <div>
          {this.state.atualizacao.toLocaleTimeString()}
        </div>
        </header>
        <div className="destaque">
          <div style={{color: this.getColor(pctBat)}}>
            <span className="simbolo-moeda">R$</span>
            <span className="lucro">{this.format(lucroBat)}</span>
            <span className="pct">({this.format(pctBat)}%)</span></div>
        </div>
        <div className="cotacoes">
          <header>Investimento</header>
          <div className="cotacao">
            <div className="field">
              <select type="number" onChange={this.handleCapitalChange} value={capital} defaultValue={venda}>
                {
                  this.valores.map(v => <option value={v}>{this.format(v, true)}</option>)
                }
              </select>
            </div>
            <div className="field">
              {/*<CountDown minutos={45}/>*/}
            </div>
          </div>

          <header><div><i className="fa fa-usd"></i><span>ETH</span></div></header>
          <div className="cotacao">
            <div className="field">
              <label>Compra em R$</label>
              <div><span className="preco">{this.format(bat.sell)}</span></div>
            </div>
            <div className="field">
              <label>Venda em BTC</label>
              {
                 erroTemeth ?
                   <input type="number" step="0,0001" value={vendaBtc} onChange={this.handleVendaBtcChange}/> :
                     <div><span className="preco">{temeth.buy}</span> <span className={classNames({'alerta': alertaETH})}>({cotacaoExternaBTC_ETH.last})</span></div>
              }
            </div>
          </div>
          <div className="cotacao">
            <div className="field">
              <label>Vol. Compra</label>
              <div>{this.format(volumeEth)}</div>
            </div>
            <div className="field">
              <label>Vol. Venda</label>
              <div>{this.format(volumeCompraEth)}</div>
            </div>
          </div>
          <header><div><i className="fa fa-btc"/>BTC</div></header>
          <div className="cotacao">
            <div className="field">
              <label>Valor</label>
              <div>
                {erroNegocie ?
                    <input type="number" value={venda} onChange={this.handleVendaChange}/> :
                    <span className="preco">R$ {this.format(venda)}</span>
                }
              </div>
            </div>
            <div className="field">
              <label>Dif. TEM:</label>
              <div>{this.format(diffTembtc)}</div>
            </div>
            <div className={classNames({field:true, passiva: true, ativa: alertaPassiva})}>
              <label>Passiva:</label>
                <div><span>{this.format(valorPassiva)}</span>
                  { alertaPassiva && <i className="fa fa-times" onClick={this.limparValorPassiva}/> }
                </div>
            </div>
          </div>
          <div className="cotacao">
            <div className="field">
              <label>Vol. compra</label>
              <div>{this.format(volume)}</div>
            </div>
            <div className="field">
              <label>Vol. venda</label>
              <div>{this.format(volumeCompra)}</div>
            </div>
            <div className="field">
              <label>Qtd.Ordens</label>
              <div>{quantidade}</div>
            </div>
          </div>


        </div>
        <hr/>
        <header>Sugestão</header>
        <div className="col2">
          <div className="cotacao">
            <div className="field">
              <label>Venda ({pctConversao}%)
                <a onClick={e => {
                  saveToStorage('pctConversao', PCT_CONVERSAO)
                  this.setState({pctConversao: PCT_CONVERSAO})
                }}><i className="fa fa-refresh"/></a>
              </label>
              <div style={{color: alertaBTC ? 'orange': 'white'}}>
                <span>{this.format(cotacaoDolar.last * dolar * pctConversao, true)}</span>
                <span className={classNames({diferenca: true, 'green': sugestao >= venda, 'red': sugestao < venda})}>
                { sugestao >= venda ? '+' : '-'}{this.format(Math.abs(sugestao - venda))}</span>
              </div>
            </div>
          </div>
          <div className="cotacao">
            <div className="field">
              <label>Dolar</label>
              <div>
                <span>{dolar}</span>
              </div>
            </div>
          </div>
        </div>
        <hr/>
        <header>Cotação Externa</header>
        <div className="cotacao">
          <table>
            <thead>
            <tr>
              <th>Par</th>
              <th>Valor</th>
              <th>R$</th>
              <th>%</th>
            </tr>
            </thead>
            <tbody>
              <tr>
                <td>USDC_BTC</td>
                <td>{parseFloat(cotacaoDolar.last).toFixed(4)}</td>
                <td>{this.format(cotacaoDolar.last * dolar)}</td>
                <td><a onClick={e => this.updatePctConversao(cotacaoDolar.last)}>
                  {this.percentualAplicado(cotacaoDolar.last * dolar, venda).toFixed(4)}
                </a></td>
              </tr>
              {
                cotacoesExternas.USDT_BTC && <tr>
                  <td>USDT_BTC</td>
                  <td>{parseFloat(cotacoesExternas.USDT_BTC.last).toFixed(4)}</td>
                  <td>{this.format(cotacoesExternas.USDT_BTC.last * dolar)}</td>
                  <td>{/*<a onClick={e => this.updatePctConversao(cotacoesExternas.USDT_BTC.last)}>*/}
                    {this.percentualAplicado(cotacoesExternas.USDT_BTC.last * dolar, venda).toFixed(4)}
                  {/*</a>*/}</td>
                </tr>
              }
              <tr>
                <td>USDC_ETH</td>
                <td>{parseFloat(cotacaoEthDolar.last).toFixed(4)}</td>
                <td>{this.format(cotacaoEthDolar.last* dolar)}</td>
                <td>{this.percentualAplicado(cotacaoEthDolar.last* dolar, bat.sell).toFixed(4)}</td>
              </tr>
              {
                cotacoesExternas.USDT_ETH && <tr>
                  <td>USDT_ETH</td>
                  <td>{parseFloat(cotacoesExternas.USDT_ETH.last).toFixed(4)}</td>
                  <td>{this.format(cotacoesExternas.USDT_ETH.last* dolar)}</td>
                  <td>{this.percentualAplicado(cotacoesExternas.USDT_ETH.last* dolar, bat.sell).toFixed(4)}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    ) : this.noDominio() && !this.usuarioLogado() && <GoogleSignIn/> );
  }
}

const MensagemErro = ({mensagem}) => <div className="mensagem erro">
  <i className="fa fa-bug"/><span>{mensagem}</span>
</div>

class CountDown extends React.Component {
  state = {
    minutoAtual: null,
    de: null,
    ate: new Date(),
    paused: true
  }

  componentDidMount(){
    const {minutos} = this.props;
    let de = new Date().setMinutes(new Date().getMinutes() + minutos);
    const ate = new Date();

    de = getFromStorage('clock-de', de)
    const paused = getFromStorage('clock-paused', true)
    this.calcularCountdown(de, ate, minutos)
  }

  togglePaused = () => {
    if (this.state.paused){
      const de = new Date().setMinutes(new Date().getMinutes() + this.props.minutos);
      saveToStorage('clock-de', de)
      this.setState({de})
    }
    this.setState({paused: !this.state.paused})
  }

  alertar = () => {
    this.setState({minutos: null, paused: true})
    saveToStorage('clock-paused', true);
  }

  calcularCountdown = (de, ate, minutos) => {
    if (de < new Date()){
      de = new Date().setMinutes(new Date().getMinutes() + minutos);
    }

    saveToStorage('clock-paused', false)
    saveToStorage('clock-de', de)

    this.interval = setInterval(() => {
      let ate2 = new Date();
      let distance = de  - ate2

      if (this.state.paused) return

      /*if (distance <= 0){
        this.alertar()
        return
      }*/

      let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((distance % (1000 * 60)) / 1000);
      this.setState({minutoAtual: `${minutes}min e ${seconds}secs`})
    }, 1000)
  }

  componentWillUnmount() {
    clearInterval(this.interval)
    saveToStorage('clock-de', undefined)
  }

  render(){
    const {minutoAtual, paused} = this.state

    return <div className="countdown">
      <span onClick={this.togglePaused}>
        <i className={classNames("fa", {'fa-stop-circle': !paused, 'fa-play-circle': paused})}/>
        </span>
      {/*<span onClick={this.start}><i className="fa fa-play-circle"/></span>*/}
      <span>{paused ? '' :  minutoAtual}</span>
    </div>
  }
}


function initGoogle(func) {
  try {
    window.gapi.load('auth2', function () {
      window.gapi.auth2.init({
        client_id: GOOGLE_CLIENT_ID
      })
          .then(func).catch(e => null);
    });
  } catch (e) {
    if (googleLoadTimer)
      clearInterval(googleLoadTimer)
  }
}
const googleLoadTimer = setInterval(() => {
  if (window.gapi) {
    initGoogle(() => {
      clearInterval(googleLoadTimer);
    });
  }
}, 90);

const GOOGLE_BUTTON_ID = 'google-sign-in-button';
class GoogleSignIn extends React.Component {
  componentDidMount() {
    if (window.location.href.indexOf('capimgrosso') >= 0){
      try {
        window.gapi.signin2.render(
            GOOGLE_BUTTON_ID,
            {
              width: 200,
              height: 50,
              onsuccess: this.onSuccess,
            }
        );
      } catch (e) {
        console.error('on google api')
      }
    }

  }
  onSuccess(googleUser) {
    const profile = googleUser.getBasicProfile();
    saveToStorage('currentUser', profile);
  }
  render() {
    return (
        <div id={GOOGLE_BUTTON_ID}/>
    );
  }
}

export default App;