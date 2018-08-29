// https://web.archive.org/web/20110924233953im_/http://www.girlfriendsking.com/photosets/PhotoSet00366/GirlfriendsKing_com_Photo_0014452.jpg

import React, { Component } from 'react';

import './DefineRange.css';

const $key = Symbol('key');

const max = (a, b) => (a > b ? a : b);

export class DefineRange extends Component {
  async addToDownloads(urls) {
    const { externalState: state } = this.props;

    const url = `/api/downloads`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state,
        urls
      })
    });
    // if (r.ok) {
    //   // this.props.history.push('/viewSet/' + this.props.externalState.setName)
    // } else {
    //   const err = await r.text()
    //   this.props.setExternalState({ stateError: err })
    // }
  }

  render() {
    const { externalState: state, setExternalState } = this.props;

    const { template = '', set = '' } = state;

    const regex = /\$\{([\w\d]+)\}/g;
    const matches = (template.match(regex) || []).map(x => x.slice(2, -1));

    const cross = matches.reduce(
      (prev, m) => {
        const first = parseInt(state[`${m}$first`] || '0', 10);
        const last = parseInt(state[`${m}$last`] | '0', 10);
        const pad = state[`${m}$pad`];
        const padF = !pad
          ? x => x
          : x =>
              `${pad + x}`.substr(
                `${pad + x}`.length - max(`${pad}`.length, `${x}`.length)
              );

        const len = last - first > 0 ? last - first + 1 : first - last + 1;
        const arr = [...new Array(len)].map((_, i) => ({
          [m]: padF(first + i)
        }));

        return arr
          .map(a => prev.map(p => ({ ...a, ...p })))
          .reduce((x, y) => [...x, ...y]);
      },
      [{}]
    );

    cross.forEach(c => {
      c[$key] = Object.entries(c)
        .map(([k, v]) => `${k}:${v}`)
        .join('-');
    });

    const input = (name, display) => (
      <div>
        <label>
          {display}{' '}
          <input
            value={state[name] || ''}
            onChange={e => setExternalState({ [name]: e.target.value })}
          />
        </label>
      </div>
    );

    const replaceF = data => (_, name) => data[name];

    const urls = cross.map(c => {
      const url = template.replace(regex, replaceF(c));
      const ret = {
        url,
        key: c[$key]
      };

      try {
        ret.filename = new URL(url).pathname.replace(/\/?.*\//, '');
      } catch (e) {}

      return ret;
    });

    return (
      <main className="define-range-main">
        <textarea
          placeholder="template"
          value={template}
          onChange={e => setExternalState({ template: e.target.value })}
        />

        <div className="matches">
          {matches.map(m => (
            <div key={m}>
              <h2>{m}</h2>
              {input(m + '$first', 'First')}
              {input(m + '$last', 'Last')}
              {input(m + '$pad', 'Pad')}
            </div>
          ))}
        </div>
        <input
          placeholder="set"
          value={set}
          onChange={e => setExternalState({ set: e.target.value })}
        />
        <button onClick={() => this.addToDownloads(urls)}>
          Add to downloads
        </button>
        <ul>
          {urls.map(({ url, key, name }) => {
            return (
              <li key={key}>
                {url}
                <br />
                {name}
                <img src={url} className="preview-image" alt="" />
              </li>
            );
          })}
        </ul>
      </main>
    );
  }
}
