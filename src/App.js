import React, { Component } from 'react';
import './App.css';
import {get} from './util/http'
import 'whatwg-fetch'
import {Slider} from "primereact/slider";
import 'primereact/resources/themes/nova-light/theme.css';
import 'primereact/resources/primereact.min.css';

const TEMBTC_URL = "https://broker.tembtc.com.br/api/v3/btcbrl/ticker"
const TEMETH_URL = "https://broker.tembtc.com.br/api/v3/ethbtc/ticker"
const NEGOCIE_URL = "https://broker.negociecoins.com.br/api/v3/btcbrl/ticker"
const BAT_URL = "https://broker.batexchange.com.br/api/v3/brleth/ticker"
const POLONIEX = "https://poloniex.com/public?command=returnTicker"
const HG_KEY="18837869"
const MOEDAS_URL = `https://api.hgbrasil.com/finance?format=json-cors&key=${HG_KEY}`
const PCT_CONVERSAO = 1.0521;

const DOLAR = 3.93

class App extends Component {
  state = {
    bat: null,
    tembtc: null,
    temeth: null,
    negocie: null,
    capital: 16000,
    atualizacao: new Date(),
    dolar: DOLAR,
    venda: 0,
    atualizando: false,
    cotacaoExternaBTC_ETH: 0
  }

  valores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map( v => v * 1000 + 10000)

  componentDidMount() {
    this.interval = setInterval(this.atualizarCotacoes, 3000)
    this.intervalPoly = setInterval(this.atualizarCotacaoExterna, 1000 * 60 * 2)
    this.intervalDolar = setInterval(this.atualizarCotacaoDolar, 1000 * 60 * 15)
    this.atualizarCotacaoExterna()
    this.atualizarCotacaoDolar()
  }

  componentWillUnmount() {
    clearInterval(this.interval)
    clearInterval(this.intervalPoly)
  }

  atualizarCotacaoDolar = () => {
    get(MOEDAS_URL).then(resp => {
      const dolar = resp.results.currencies.USD.buy
      this.setState({dolar})
    })
  }

  atualizarCotacaoExterna = () => {
      get(POLONIEX).then(resp => resp).then(resp => {
        this.setState({ cotacaoDolar: resp.USDC_BTC, cotacaoExternaBTC_ETH: resp.BTC_ETH })
      })
  }

  atualizarCotacoes = () => {
    const {capital} = this.state
    this.setState({atualizando: true})
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
      let venda = result.negocie.buy ? parseInt(result.negocie.buy) : this.state.venda
      let vlrVenda = vlrVendaBtc * venda
      const taxas = (vlrVenda * 0.020) + 5
      const lucroBat = (vlrVenda - capital) - taxas
      const pctBat = (lucroBat / capital) * 100
      this.setState({...result, lucroBat, pctBat, atualizacao: new Date(), venda, atualizando: false})
    })
  }

  handleCapitalChange = (e) => {
    this.setState({capital: e.value}, () => {
      this.atualizarCotacoes()
      this.atualizarCotacaoExterna()
    })
  }
  handleVendaChange = (e) => this.setState({venda: e.target.value})

  getColor = (pct) => {
    const colors = {
      zerado: 'white',
      normal: '#20b020',
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

  percentualAplicado = (cotacaoExterna, cotacao) => (cotacao - cotacaoExterna) / cotacaoExterna

  format = (numero, moeda=false) => {
    const style = moeda ? {style: 'currency', currency: 'BRL'} : {}
    return numero.toLocaleString('pt-BR', {...style, maximumFractionDigits: 2})
  }

  render() {
    const {cotacaoDolar, venda, tembtc, temeth, negocie, bat, capital, lucroBat, pctBat,
        dolar,
        cotacaoExternaBTC_ETH
      } = this.state

    if (!tembtc)
      return null

    // const venda = negocie.buy ? negocie.buy : this.state.venda

    return (
      <div className="App">
        <header><span>Retorno</span>
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
        <hr/>
        <div className="cotacoes">
          <header>Investimento</header>
          <div className="cotacao">
            <div className="field slider">
              <Slider min={5000} max={20000} step={1000} value={capital} onChange={this.handleCapitalChange}/>
              <span>{this.format(capital, true)}</span>
{/*              <select type="number" onChange={this.handleCapitalChange} value={capital} defaultValue={venda}>
                {
                  this.valores.map(v => <option value={v}>{this.format(v, true)}</option>)
                }
              </select>*/}
            </div>
          </div>
          <header>BTC</header>
          <div className="cotacao">
            <div className="field">
              <label>Compra</label>
              <div>{this.format(tembtc.sell)}</div>
            </div>
            <div className="field">
              <label>Venda</label>
              <div>
                {negocie.buy ?
                  <span>{this.format(venda)}</span> :
                  <input type="number" value={venda} onChange={this.handleVendaChange}/>
                }
                </div>
            </div>
            <div className="field">
              <label>Diferença</label>
              <div>{this.format(venda - tembtc.sell)}</div>
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
              <div>{temeth.buy} <span>({cotacaoExternaBTC_ETH.highestBid})</span></div>
            </div>
          </div>
        </div>
        <hr/>
        <header>Sugestão</header>
        <div className="col2">
          <div className="cotacao">
            <div className="field">
              <label>Venda ({PCT_CONVERSAO}%)</label>
              <div style={{color: this.percentualAplicado(cotacaoDolar.highestBid * dolar * PCT_CONVERSAO, venda) + 1 > PCT_CONVERSAO ? 'green':'white'}}>
                <span>{this.format(cotacaoDolar.highestBid * dolar * PCT_CONVERSAO, true)}</span>
              </div>
            </div>
          </div>
          <div className="cotacao">
            <div className="field">
              <label>Dolar</label>
              <div>
                <span>{this.format(dolar, true)}</span>
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
              <th>Cotação</th>
              <th>US$</th>
              <th>R$</th>
              <th>%</th>
            </tr>
            </thead>
            <tbody>
              <tr>
                <td>lance +alto</td>
                <td>{parseFloat(cotacaoDolar.highestBid).toFixed(4)}</td>
                <td>{this.format(cotacaoDolar.highestBid * dolar)}</td>
                <td>{this.percentualAplicado(cotacaoDolar.highestBid * dolar, venda).toFixed(4)}</td>
              </tr>
              <tr>
                <td>Ultima</td>
                <td>{parseFloat(cotacaoDolar.last).toFixed(4)}</td>
                <td>{this.format(cotacaoDolar.last* dolar)}</td>
                <td>{this.percentualAplicado(cotacaoDolar.last* dolar, venda).toFixed(4)}</td>
              </tr>
              <tr>
                <td>menor venda</td>
                <td>{parseFloat(cotacaoDolar.lowestAsk).toFixed(4)}</td>
                <td>{this.format(cotacaoDolar.lowestAsk* dolar)}</td>
                <td>{this.percentualAplicado(cotacaoDolar.lowestAsk* dolar, venda).toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/*<div className="cotacao">*/}
          {/*<div className="field">*/}
            {/*<label>HighestBid</label>*/}
            {/*<div>{parseFloat(cotacaoDolar.highestBid).toFixed(2)} * ${dolar} => ${(cotacaoDolar.highestBid * dolar).toFixed(4)}*/}
              {/*=> % {this.percentualAplicado(cotacaoDolar.highestBid * dolar, venda).toFixed(4)}</div>*/}
          {/*</div>*/}
        {/*</div>*/}
        {/*<div className="cotacao">*/}
          {/*<div className="field">*/}
            {/*<label>Last</label>*/}
            {/*<div>{parseFloat(cotacaoDolar.last).toFixed(2)} * ${dolar} => ${(cotacaoDolar.last * dolar).toFixed(4)}*/}
            {/*=> % {this.percentualAplicado(cotacaoDolar.last * dolar, venda).toFixed(4)}</div>*/}
          {/*</div>*/}
        {/*</div>*/}
        {/*<div className="cotacao">*/}
          {/*<div className="field">*/}
            {/*<label>lowestAsk</label>*/}
            {/*<div>{parseFloat(cotacaoDolar.lowestAsk).toFixed(2)} * ${dolar} => ${(cotacaoDolar.lowestAsk * dolar).toFixed(4)}*/}
            {/*=> % {this.percentualAplicado(cotacaoDolar.lowestAsk * dolar, venda).toFixed(4)}</div>*/}
          {/*</div>*/}
        {/*</div>*/}
      </div>
    );
  }
}

export default App;
