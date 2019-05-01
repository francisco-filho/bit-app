import React, { Component } from 'react';
import './App.css';
import {get} from './util/http'
import 'whatwg-fetch'
import classNames from "classnames";

const TEMBTC_URL = "https://broker.tembtc.com.br/api/v3/btcbrl/ticker"
const TEMETH_URL = "https://broker.tembtc.com.br/api/v3/ethbtc/ticker"
const NEGOCIE_URL = "https://broker.negociecoins.com.br/api/v3/btcbrl/ticker"
const NEGOCIE_LIVRO_URL = "https://broker.negociecoins.com.br/api/v3/btcbrl/orderbook"
const BAT_URL = "https://broker.batexchange.com.br/api/v3/brleth/ticker"
const POLONIEX = "https://poloniex.com/public?command=returnTicker"
const MOEDAS_URL="http://68.183.139.142:3001/api/cotacoes";
const PCT_CONVERSAO = 1.0645;

const DOLAR = 3.9224

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
    pctConversao: getFromStorage('pctConversao', PCT_CONVERSAO),
    alertaETH: false,
    volume: 0,
    quantidade: 0,
    volumeCompra: 0,
    quantidadeCompra: 0,
    erroTembtc: false,
    erroTemeth: false,
    erroNegocie: false
  }

  valores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 31, 32, 33, 34, 35, 40]
    .map( v => v * 1000 + 10000)

  componentDidMount() {
    this.interval = setInterval(this.atualizarCotacoes, 3000)
    this.intervalPoly = setInterval(this.atualizarCotacaoExterna, 1000 * 60 * 1)
    this.intervalDolar = setInterval(this.atualizarCotacaoDolar, 1000 * 60 * 2)
    this.intervalLivro = setInterval(this.atualizarLivro, 1000 * 4)
    this.atualizarCotacaoDolar()
    this.atualizarLivro()
    setTimeout(this.atualizarCotacaoExterna, 2000)
  }

  componentWillUnmount() {
    clearInterval(this.interval)
    clearInterval(this.intervalPoly)
    clearInterval(this.intervalDolar)
    clearInterval(this.intervalLivro)
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
          this.setState({ cotacaoDolar: resp.USDC_BTC, cotacaoExternaBTC_ETH: resp.BTC_ETH})
      })
  }

  atualizarLivro = () => {
    const {negocie} = this.state

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
  }

  atualizarCotacoes = () => {
    const {capital, venda, vendaBtc} = this.state
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

      let vendaBtc = result.temeth.buy ? result.temeth.buy : vendaBtc
      let venda = result.negocie.buy ? parseFloat(result.negocie.buy) : venda

      let vlrCompra = capital / result.bat.sell
      let vlrVendaBtc  = vlrCompra * vendaBtc
      let vlrVenda = vlrVendaBtc * venda
      const taxas = (vlrVenda * 0.01975) + 8
      const lucroBat = (vlrVenda - capital) - taxas
      const pctBat = (lucroBat / capital) * 100
      this.setState({...result, lucroBat, pctBat, atualizacao: new Date(),
        venda,
        vendaBtc,
        erroTemeth: !(!!resp[1]),
        erroNegocie: !(!!resp[2]),
        atualizando: false})
    })
  }

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
        pctConversao,
        volume,
        vendaBtc,
        quantidade,
        erroNegocie,
        erroTemeth,
      volumeCompra

      } = this.state

    if (!temeth.buy && !negocie.buy && !cotacaoExternaBTC_ETH)
      return null

    const alertaETH = temeth.buy >= parseFloat((""+cotacaoExternaBTC_ETH.highestBid).substr(0, 6))
    const alertaBTC = (venda - (cotacaoDolar.highestBid * dolar * pctConversao)) > 15;
    const sugestao = cotacaoDolar.highestBid * dolar * pctConversao;

    return (
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
          </div>
          <header>BTC</header>
          <div className="cotacao">
            <div className="field">
              <label>Venda</label>
              <div>
                {erroNegocie ?
                  <input type="number" value={venda} onChange={this.handleVendaChange}/> :
                  <span>{this.format(venda)}</span>
                }
                </div>
            </div>
            <div className="field">
              <label>Qtd.Ordens</label>
              <div>{quantidade}</div>
            </div>
            <div className="field">
              <label>Vol. Total</label>
              <div>{this.format(volume)}</div>
            </div>
          </div>
          <div className="cotacao">
            <div className="field">
              <label>Compra</label>
              <div>{this.format(tembtc.sell)}</div>
            </div>
            <div className="field">
              <label>Diferença</label>
              <div>{this.format(venda - tembtc.sell)}</div>
            </div>
            <div className="field">
              <label>Vol. Total</label>
              <div>{this.format(volumeCompra)}</div>
            </div>
          </div>
          <header>ETH</header>
          <div className="cotacao">
            <div className="field">
              <label>Compra em R$</label>
              <div>{this.format(bat.sell)}</div>
            </div>
            <div className="field">
              <label>Venda em BTC</label>
              {
                 erroTemeth ?
                   <input type="number" step="0,0001" value={vendaBtc} onChange={this.handleVendaBtcChange}/> :
                   <div>{temeth.buy} <span className={classNames({'alerta': alertaETH})}>({cotacaoExternaBTC_ETH.highestBid})</span></div>
              }
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
                <span>{this.format(cotacaoDolar.highestBid * dolar * pctConversao, true)}</span>
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
        <header>BTC - Cotação Externa</header>
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
                <td><a onClick={e => this.updatePctConversao(cotacaoDolar.highestBid)}>
                  {this.percentualAplicado(cotacaoDolar.highestBid * dolar, venda).toFixed(4)}
                </a></td>
              </tr>
              <tr>
                <td>Ultima</td>
                <td>{parseFloat(cotacaoDolar.last).toFixed(4)}</td>
                <td>{this.format(cotacaoDolar.last* dolar)}</td>
                <td><a onClick={e => this.updatePctConversao(cotacaoDolar.last)}>
                  {this.percentualAplicado(cotacaoDolar.last* dolar, venda).toFixed(4)}</a></td>
              </tr>
              <tr>
                <td>menor venda</td>
                <td>{parseFloat(cotacaoDolar.lowestAsk).toFixed(4)}</td>
                <td>{this.format(cotacaoDolar.lowestAsk* dolar)}</td>
                <td><a onClick={e => this.updatePctConversao(cotacaoDolar.lowestAsk)}>
                  {this.percentualAplicado(cotacaoDolar.lowestAsk* dolar, venda).toFixed(4)}</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

const MensagemErro = ({mensagem}) => <div className="mensagem erro">
  <i className="fa fa-bug"/><span>{mensagem}</span>
</div>


export default App;
