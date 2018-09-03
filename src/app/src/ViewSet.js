import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import './ViewSet.css'

export class ViewSet extends Component {
  constructor (props) {
    super(props)
    this.state = { set: null }
  }

  async componentWillMount () {
    const { match: { params: { setName } } } = this.props
    const url = `/api/sets/${setName}`
    const set = await fetch(url).then(r => r.json())
    this.setState({ set })
  }

  componentDidMount() {
    this.keydown = e => {
      console.log('e:', e.keyCode)
      if (e.keyCode === 37 || e.keyCode === 39) {
        e.preventDefault()
        const { history, match: { params: { setName, index } } } = this.props
        const to = (parseInt(index||'0'))+ (e.keyCode === 39 ? 1 : -1)

        try {
          if (to < 0 || to >= this.state.set.images.length) {
            return
          }
          const loc = `/set/${setName}/${to}`
          history.push(loc);
          console.log('push loc:', loc)
        }catch(e){}
      }
    }
    document.addEventListener('keydown', this.keydown )

  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.keydown )
  }

  render () {
    const { match: { params: { setName, index } } } = this.props
    const { set } = this.state

    if (!set) return <div>Loading...</div>

    console.log('set:', set)
    const { content, images = [] } = set
    const mainImage = images[index || 0]

    return (
      <main className='view-set-main'>
        <h1>View</h1>
        {content && <ul>
          {content.map(cont => <li>
            <Link to={`/set/${setName}$${cont}`}>
              {cont}
            </Link>
          </li>)}
        </ul>}
        <div className='view-images'>
          {images.map((src, i) => (
            <div key={src} className='view-image'>
              <Link to={`/set/${setName}/${i}`}>
                <img src={`/assets/sets/${setName}/images/${src}`} alt={src} />
              </Link>
            </div>
          ))}
        </div>
        <div className='mainImage'>
          <img src={`/assets/sets/${setName}/images/${mainImage}`} alt={mainImage} />
        </div>
      </main>
    )
  }
}
