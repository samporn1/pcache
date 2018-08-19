import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import registerServiceWorker from './registerServiceWorker'


class AppState extends React.Component {
  constructor(props) {
    super(props)
    try {
      const json = sessionStorage.getItem('externalState')
      this.state = JSON.parse(json) || {}
    } catch (e) {
      console.log('e:', e)
      this.state = {}
    }
  }

  setExternalState (newState, done) {
    this.setState(newState, () => {
      try {
        const json = JSON.stringify(this.state)
        sessionStorage.setItem('externalState', json)
      } catch (e) {
        console.log('e:', e)
      }

      if (typeof done === 'function') {done()}
    })

  }

  render() {
    return <App externalState={this.state} setExternalState={this.setExternalState.bind(this)} />
  }
}

ReactDOM.render(<AppState />, document.getElementById('root'))
registerServiceWorker()
