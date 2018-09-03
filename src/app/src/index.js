import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
//import registerServiceWorker from './registerServiceWorker'


class AppState extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    for(let i=0; i<sessionStorage.length; i++) {
      let key = sessionStorage.key(i)
      try {
        const json = sessionStorage.getItem(key)
        this.state[key] = JSON.parse(json) || {}
      } catch (e) {
        console.log('e:', e)
      }
    }
  }

  setExternalState (name) {
    return (state, done) => {
      const newState = {...this.state[name], ...state}
      this.setState({[name]: newState}, () => {
        try {
          const json = JSON.stringify(newState)
          sessionStorage.setItem(name, json)
        } catch (e) {
          console.log('e:', e)
        }

        if (typeof done === 'function') {done()}
      })
    }
  }

  render() {
    return <App externalState={this.state} setExternalState={this.setExternalState.bind(this)} />
  }
}

ReactDOM.render(<AppState />, document.getElementById('root'))
//registerServiceWorker()
