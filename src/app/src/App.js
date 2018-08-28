import React, { Component } from 'react';
import { BrowserRouter, Route, Link } from 'react-router-dom';

import { Home } from './Home';
import { DefineSet } from './DefineSet';
import { DefineRange } from './DefineRange';
import { ViewSet } from './ViewSet';
import { Downloads } from './Downloads';

import './App.css';

class App extends Component {
  render() {
    const makeState = name => {
      return {
        externalState: this.props.externalState[name] || {},
        setExternalState: this.props.setExternalState(name)
      };
    };
    return (
      <BrowserRouter>
        <div>
          <header>
            <Link to="/">Home</Link>
            {' | '}
            <Link to="/downloads">Downloads</Link>
            {' | '}
            <Link to="/define-range">Range</Link>
          </header>

          <main>
            <Route path="/" exact component={Home} />
            <Route path="/downloads" component={Downloads} />
            <Route
              path="/define-set"
              render={props => (
                <DefineSet {...props} {...makeState('DefineSet')} />
              )}
            />
            <Route
              path="/define-range"
              render={props => (
                <DefineRange {...props} {...makeState('DefineRange')} />
              )}
            />
            <Route path="/set/:setName" exact component={ViewSet} />
            <Route path="/set/:setName/:index" exact component={ViewSet} />
          </main>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
