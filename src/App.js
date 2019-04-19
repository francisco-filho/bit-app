import React, { Component } from 'react';
import './App.css';
import {get} from './util/http'
import 'whatwg-fetch'

const TEMBTC_URL = "https://broker.tembtc.com.br/api/v3/btcbrl/ticker"
const TEMETH_URL = "https://broker.tembtc.com.br/api/v3/ethbtc/ticker"
const NEGOCIE_URL = "https://broker.negociecoins.com.br/api/v3/btcbrl/ticker"
const BAT_URL = "https://broker.batexchange.com.br/api/v3/brleth/ticker"
const POLONIEX = "https://poloniex.com/public?command=returnTicker"
const MOEDAS_URL = "https://api.hgbrasil.com/finance"

const DOLAR = 3.88

class App extends Component {
  state = {
    bat: null,
    tembtc: null,
    temeth: null,
    negocie: null,
    capital: 14000,
    atualizacao: new Date(),
    dolar: DOLAR,
    conversaoUSD: 0,
    venda: 0
  }

  valores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map( v => v * 1000 + 10000)

  componentDidMount() {
    this.interval = setInterval(this.atualizarCotacoes, 5000)
    this.intervalPoly = setInterval(this.atualizarCotacaoExterna, 1000 * 60 * 10)
    this.atualizarCotacaoExterna()
  }

  componentWillUnmount() {
    clearInterval(this.interval)
    clearInterval(this.intervalPoly)
  }

  atualizarCotacaoExterna = () => {
      get(POLONIEX).then(resp => resp.USDC_BTC.last).then(resp => {
        console.log('poloniex cncluido')
        // get(MOEDAS_URL).then(resp => {
        //   const dolar = resp.results.currencies.USD.buy
        //   console.log('dolar cncluido')
        // })
        this.setState({conversaoUSD: this.state.dolar * resp})
      })
  }

  atualizarCotacoes = () => {
    const {capital} = this.state
    Promise.all([
      get(TEMBTC_URL).then(resp => resp),
      get(TEMETH_URL).then(resp => resp),
      get(NEGOCIE_URL).then(resp => resp).catch(err => 0),
      get(BAT_URL).then(resp => resp),
    ]).then(resp => {
      const result = {
        tembtc: resp[0],
        temeth: resp[1],
        negocie: resp[2],
        bat: resp[3]
      }

      let vlrCompra = capital / result.bat.sell
      let vlrVendaBtc  = vlrCompra * result.temeth.buy
      let venda = result.negocie.buy ? result.negocie.buy : this.state.venda
      let vlrVenda = vlrVendaBtc * venda
      const taxas = (vlrVenda * 0.020) + 8
      const lucroBat = (vlrVenda - capital) - taxas
      const pctBat = (lucroBat / capital) * 100


      this.setState({...result, lucroBat, pctBat, atualizacao: new Date()})
    })
  }

  handleCapitalChange = (e) => this.setState({capital: e.target.value})
  handleVendaChange = (e) => this.setState({venda: e.target.value})

  getColor = (pct) => {
    const colors = {
      zerado: 'white',
      normal: 'green',
      bom: 'dodgerblue',
      otimo: 'red'
    }

    if (pct < .3){
      return colors.zerado
    } else
    if (pct < .5){
      return colors.normal
    } else
    if (pct < .7){
      return colors.bom
    } else
      return colors.otimo
  }


  render() {
    const {venda, tembtc, temeth, negocie, bat, capital, lucroBat, pctBat} = this.state

    if (!tembtc)
      return null

    // const venda = negocie.buy ? negocie.buy : this.state.venda

    return (
      <div className="App">
        <div className="cotacoes">
          <header>Investimento</header>
          <div className="cotacao">
            <div className="field">
              <select type="number" onChange={this.handleCapitalChange} value={capital}>
                {
                  this.valores.map(v => <option value={v} selected={capital === v}>{v}</option>)
                }
              </select>
            </div>
          </div>
          <header>BTC</header>
          <div className="cotacao">
            <div className="field">
              <label>Compra</label>
              <div>{tembtc.sell}</div>
            </div>
            <div className="field">
              <label>Venda</label>
              <div><input type="number" value={venda} onChange={this.handleVendaChange}/></div>
            </div>
            <div className="field">
              <label>Diff</label>
              <div>{venda - tembtc.sell}</div>
            </div>
          </div>
          <header>ETH</header>
          <div className="cotacao">
            <div className="field">
              <label>Compra em R$</label>
              <div>{bat.sell}</div>
            </div>
            <div className="field">
              <label>Venda em BTC</label>
              <div>{temeth.buy}</div>
            </div>
          </div>
        </div>
        <hr/>
        <header>USD</header>
        <div className="cotacao">
          <div className="field">
            <label>Cotação externa</label>
            <div>{this.state.conversaoUSD}</div>
          </div>
        </div>
        <hr/>
        <header>Bat Lucro</header>
        <div className="destaque">
          <div>
            <span className="simbolo-moeda">R$</span>
            <span style={{color: this.getColor(pctBat)}}>{lucroBat.toFixed(2)}</span>
            <span className="pct">({pctBat.toFixed(2)}%)</span></div>
        </div>
        <div>
          {this.state.atualizacao.toLocaleTimeString()}
        </div>
      </div>
    );
  }
}

export default App;
