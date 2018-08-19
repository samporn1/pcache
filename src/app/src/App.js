import React, { Component } from 'react'
import { BrowserRouter, Route } from 'react-router-dom'

import { Home } from './Home'
import { DefineSet } from './DefineSet'
import { ViewSet } from './ViewSet'

import './App.css'

class App extends Component {
  render () {
    return (
      <BrowserRouter>
        <div>
          <Route path='/' exact component={Home} />
          <Route path='/define-set' render={(props) => <DefineSet {...props} {...this.props}/> } />
          <Route path='/set/:setName' exact component={ViewSet} />
          <Route path='/set/:setName/:index' exact component={ViewSet} />
        </div>
      </BrowserRouter>
    )
  }
}

export default App
