import React, { Component } from 'react'

export class Downloads extends Component {
  constructor (props) {
    super(props)
    this.state = { allDownloads: [] }
  }

  async componentWillMount () {
    const url = '/api/downloads'
    const allDownloads = await fetch(url).then(r => r.json())
    this.setState({ allDownloads })
  }

  async go (download) {
    const url = `/api/downloads/${download.id}`
    const newDownload = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state: 'downloading'
      })
    }).then(r => r.json())

    const allDownloads = this.state.allDownloads.map(x =>
      x.id === download.id ? newDownload : x
    )
    this.setState({ allDownloads })
  }

  render () {
    const { allDownloads } = this.state
    console.log('allDownloads:', allDownloads)
    return (
      <div>
        <hr />
        <h2>All Downloads</h2>
        <ul>
          {allDownloads.map(download => (
            <li key={download.id}>
              <div>{download.id}</div>
              <div>{download.url}</div>
              <div>{download.set}</div>
              <div>{download.name}</div>
              <div>{download.state}</div>
              <button onClick={() => this.go(download)}>Go</button>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}
