import React, { Component } from 'react';

import './Downloads.css';

const range = (start, end) =>
  [...Array(end - start + 1)].map((_, i) => start + i);

export class Downloads extends Component {
  constructor(props) {
    super(props);
    this.state = { allDownloads: [], selected: [], all: false };
  }

  async componentWillMount() {
    const allDownloads = await fetch('/api/downloads').then(r => r.json());
    this.setState({ allDownloads });
  }

  keyDown(e) {
    if (e.shiftKey) {
      this.shift = true;
    }
  }

  keyUp(e) {
    if (!e.shiftKey) {
      this.shift = false;
    }
  }

  componentDidMount() {
    this.keyDownF = this.keyDown.bind(this);
    this.keyUpF = this.keyUp.bind(this);
    document.body.addEventListener('keydown', this.keyDownF);
    document.body.addEventListener('keyup', this.keyUpF);
  }

  componentWillUnmount() {
    document.body.removeEventListener('keydown', this.keyUpF);
    document.body.removeEventListener('keyup', this.keyUpF);
  }

  async clearComplete() {
    const url = '/api/downloads/action/clear-complete';
    const allDownloads = await fetch(url, { method: 'POST' }).then(r =>
      r.json()
    );
    this.setState({ allDownloads });
  }

  async clearSelected() {
    const url = '/api/downloads/action/clear-selected';
    const allDownloads = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selected: this.state.selected.map(
          i => (this.state.allDownloads[i] || {}).id
        )
      })
    }).then(r => r.json());
    this.setState({ allDownloads, selected: [] });
  }

  async startSelected() {
    const ids = this.state.selected.map(
      i => (this.state.allDownloads[i] || {}).id
    );
    for (let id of ids) {
      let url = `/api/downloads/n/${id}`;
      const newDownload = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: 'downloading'
        })
      }).then(r => r.json());

      const allDownloads = this.state.allDownloads.map(
        x => (x.id === id ? newDownload : x)
      );
      this.setState({ allDownloads });
    }
  }

  async go(download) {
    const url = `/api/downloads/n/${download.id}`;
    const newDownload = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state: 'downloading'
      })
    }).then(r => r.json());

    const allDownloads = this.state.allDownloads.map(
      x => (x.id === download.id ? newDownload : x)
    );
    this.setState({ allDownloads });
  }

  select(e, i) {
    console.log('e:', e);
    let selected;
    if (this.shift) {
      const [start, end] = [i, this.state.lastIndex].sort((a, b) => a - b);
      console.log('start, end:', start, end);
      if (e.target.checked) {
        selected = [...new Set([...this.state.selected, ...range(start, end)])];
        this.setState({ selected, lastIndex: null });
      } else {
        const r = range(start, end);
        selected = this.state.selected.filter(x => !r.includes(x));
        this.setState({ selected, lastIndex: null });
      }
    } else {
      selected = e.target.checked
        ? [...new Set([...this.state.selected, i])]
        : this.state.selected.filter(x => x !== i);
      this.setState({ selected, lastIndex: i });
    }

    console.log('selected:', selected);

    if (selected.length === 0) {
      this.setState({ all: false });
    }

    if (selected.length === this.state.allDownloads.length) {
      this.setState({ all: true });
    }
  }

  selectAll(e) {
    const all = e.target.checked;
    this.setState({
      all,
      selected: all ? this.state.allDownloads.map((_, i) => i) : []
    });
  }

  render() {
    const { allDownloads } = this.state;

    return (
      <div>
        <hr />
        <h2>All Downloads</h2>
        <button onClick={() => this.clearComplete()}>Clear complete</button>
        <button onClick={() => this.clearSelected()}>Clear selected</button>
        <button onClick={() => this.startSelected()}>Start selected</button>
        <div className="downloads">
          <div style={{ gridColumn: 1 }}>
            <input
              type="checkbox"
              checked={this.state.all}
              onChange={e => this.selectAll(e)}
            />
          </div>
          {['url', 'set', 'name', 'status', 'actions'].map((headder, i) => (
            <div
              key={headder}
              style={{ gridColumn: i + 2 }}
              className="headder"
            >
              {headder}
            </div>
          ))}
          {allDownloads.map((download, i) => {
            const rows = {
              url: download.url,
              set: download.set,
              name: download.name,
              status: `${download.state} l:${download.size} r:${download.rsize}`
            };
            return (
              <React.Fragment key={download.id}>
                <div style={{ gridColumn: 1 }}>
                  <input
                    type="checkbox"
                    onChange={e => this.select(e, i)}
                    checked={this.state.selected.includes(i)}
                  />
                </div>
                {Object.entries(rows).map(([k, v], i) => (
                  <div key={k} style={{ gridColumn: i + 2 }}>
                    {v}
                  </div>
                ))}
                <div style={{ gridColumn: 6 }}>
                  <button onClick={() => this.go(download)}>Go</button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
}
