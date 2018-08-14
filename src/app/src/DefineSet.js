import React, { Component } from 'react'
import queryString from 'query-string'

export class DefineSet extends Component {
  constructor (props) {
    super(props)
    const search = queryString.parse(props.location.search)
    const { site } = search

    const setName = site
      .replace(/https?:\/\//i, '')
      .replace(/[/.:]/gi, '-')
      .replace(/![a-z]/gi, '')

    this.state = {
      filter: '',
      setName,
      site
    }
  }

  // com\/([a-z0-9-]+)     ${1}
  calcFileName (url, host, i) {
    try {
      const regexp = new RegExp(host.nameRegex)
      const matches = url.match(regexp)
      const pathname = new URL(url).pathname.replace(/\/?.*\//, '')
      const name = host.namePattern
        .replace(/\${([0-9]+)}/g, (_, n) => matches[parseInt(n, 10)])
        .replace(/\${i}/g, i)
        .replace(/\${n}/g, pathname)

      return name // { host, matches, name }
    } catch (e) {
      return e.toString()
    }
  }

  calcFileNames (images, hosts) {
    return images.map((img, i) => ({
      ...img,
      filename: this.calcFileName(
        img.url,
        hosts.find(x => x.host === new URL(img.url).host),
        i + 1
      )
    }))
  }

  async componentWillMount () {
    const { site } = this.state
    const url = `/api/readImages?site=${site}`
    const allImages = await fetch(url).then(r => r.json())
    const rawImages = allImages.map(url => ({
      url
    }))
    const selectedImages = allImages
    const selectedHosts = this.readHosts(allImages)
    const hosts = selectedHosts.map(host => ({
      host,
      nameRegex: 'com/([a-z0-9-]+)',
      namePattern: `\${i}`
    }))
    const images = this.calcFileNames(rawImages, hosts)
    this.setState({ images, selectedImages, hosts, selectedHosts })
  }

  add (list, item) {
    const [key, value] = Object.entries(list)[0]
    const newValue = [...new Set(value).add(item)]
    this.setState({ [key]: newValue })
  }

  remove (list, item) {
    const [key, value] = Object.entries(list)[0]
    const newValue = value.filter(x => x !== item)
    this.setState({ [key]: newValue })
  }

  readHosts (images) {
    return [...new Set(images.map(x => new URL(x).host))]
  }

  go (setName, body) {
    this.setState(
      {
        working: true
      },
      async () => {
        const url = `/api/sets/${setName}`
        const r = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })
        if (r.ok) {
          // this.props.history.push('/viewSet/' + this.state.setName)
        } else {
          const err = await r.text()
          this.setState({ stateError: err })
        }
      }
    )
  }

  setHostRegex (host, newVal) {
    const newHosts = this.state.hosts.map(x => ({ ...x }))
    const match = newHosts.find(x => x.host === host)
    match.nameRegex = newVal
    const images = this.calcFileNames(this.state.images, newHosts)
    this.setState({ hosts: newHosts, images })
  }

  setHostPattern (host, newVal) {
    const newHosts = this.state.hosts.map(x => ({ ...x }))
    const match = newHosts.find(x => x.host === host)
    match.namePattern = newVal
    const images = this.calcFileNames(this.state.images, newHosts)
    this.setState({ hosts: newHosts, images })
  }

  render () {
    const { images } = this.state
    if (!images) return <p>Reading...</p>

    const {
      selectedImages,
      setName,
      filter,
      hosts,
      selectedHosts,
      stateError
    } = this.state

    const [filterRegex, filterError] = (() => {
      if (!filter.length) return [null, null]
      try {
        return [new RegExp(filter, 'i'), null]
      } catch (e) {
        return [null, `${e}`]
      }
    })()

    const errorMessage = filterError || stateError

    const hostMatches = i => selectedHosts.includes(new URL(i).host)

    const selectedResult = filterRegex
      ? images.filter(x => filterRegex.test(x)).filter(hostMatches)
      : selectedImages.filter(hostMatches)

    const body = {
      def: {
        filter,
        hosts: hosts.map(host => ({
          ...host,
          chosen: selectedHosts.includes(host.host)
        }))
      },
      images: images.filter(x => selectedResult.includes(x.url))
    }

    return (
      <div className='pageRoot'>
        <header>
          <label className='topText'>
            <p>Set name:</p>
            <input
              value={setName}
              onChange={e => this.setState({ setName: e.target.value })}
            />
          </label>
          <label className='topText'>
            <p>Filter:</p>
            <input
              value={filter}
              onChange={e => this.setState({ filter: e.target.value })}
            />
          </label>
          <fieldset>
            <legend>Hosts</legend>
            <div className='hostList'>
              {hosts.map(h => (
                <React.Fragment key={h.host}>
                  <div>
                    <label>
                      <input
                        type='checkbox'
                        checked={selectedHosts.includes(h.host)}
                        onChange={e => {
                          e.target.checked
                            ? this.add({ selectedHosts }, h.host)
                            : this.remove({ selectedHosts }, h.host)
                        }}
                      />
                      {h.host}
                    </label>
                  </div>
                  <input
                    type='text'
                    placeholder='regex'
                    value={h.nameRegex}
                    onChange={e => this.setHostRegex(h.host, e.target.value)}
                  />
                  <input
                    type='text'
                    placeholder='pattern'
                    value={h.namePattern}
                    onChange={e => this.setHostPattern(h.host, e.target.value)}
                  />

                </React.Fragment>
              ))}
            </div>
          </fieldset>
        </header>
        <main>
          <ul className='imageGrid'>
            {images.map(img => (
              <li
                key={img.url}
                className={selectedResult.includes(img.url) ? 'in' : 'out'}
              >
                <div>In: {selectedResult.includes(img.url) ? '✓' : '✗'}</div>
                <div>{img.filename}</div>
                <div className='imageGrid-container'>
                  <img src={img.url} alt='' />
                </div>
                <input
                  type='checkbox'
                  checked={selectedImages.includes(img.url)}
                  onChange={e => {
                    e.target.checked
                      ? this.add({ selectedImages }, img.url)
                      : this.remove({ selectedImages }, img.url)
                  }}
                />
              </li>
            ))}
          </ul>
          <input
            type='submit'
            value='Go'
            onClick={() => this.go(setName, body)}
          />
          {errorMessage && <div className='errorMessage'>{errorMessage}</div>}
          <pre>body: {JSON.stringify(body, null, '  ')}</pre>
        </main>
      </div>
    )
  }
}
