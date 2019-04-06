import React, { Component } from 'react';
import './App.css';
import {get} from './util/http'
import 'whatwg-fetch'

const TEMBTC_URL = "https://broker.tembtc.com.br/api/v3/btcbrl/ticker"
const TEMETH_URL = "https://broker.tembtc.com.br/api/v3/ethbtc/ticker"
const NEGOCIE_URL = "https://broker.negociecoins.com.br/api/v3/btcbrl/ticker"
const BAT_URL = "https://broker.batexchange.com.br/api/v3/brleth/ticker"

class App extends Component {
  state = {
    bat: null,
    tembtc: null,
    temeth: null,
    negocie: null,
    capital: 11000,
    atualizacao: new Date()
  }

  componentDidMount() {
    this.interval = setInterval(this.atualizarCotacoes, 3000)
  }

  componentWillUnmount() {
    console.log('cler interval.')
    clearInterval(this.interval)
  }

  atualizarCotacoes = () => {
    const {capital} = this.state
    Promise.all([
      get(TEMBTC_URL).then(resp => resp),
      get(TEMETH_URL).then(resp => resp),
      get(NEGOCIE_URL).then(resp => resp),
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
      let vlrVenda = vlrVendaBtc * result.negocie.buy
      const taxas = (vlrVenda * 0.020) + 8
      const lucroBat = (vlrVenda - capital) - taxas
      const pctBat = (lucroBat / capital) * 100


      this.setState({...result, lucroBat, pctBat, atualizacao: new Date()})
    })
  }

  handleCapitalChange = (e) => this.setState({capital: e.target.value})

  getColor = (pct) => {
    const colors = {
      zerado: 'white',
      normal: 'green',
      bom: 'blue',
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
    const {tembtc, temeth, negocie, bat, capital, lucroBat, pctBat} = this.state

    if (!tembtc)
      return null

    return (
      <div className="App">
        <div className="cotacoes">
          <header>Investimento</header>
          <div className="cotacao">
            <div className="field">
              <input type="number" onChange={this.handleCapitalChange} value={capital}/>
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
              <div>{negocie.buy}</div>
            </div>
            <div className="field">
              <label>Diff</label>
              <div>{negocie.buy - tembtc.sell}</div>
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
