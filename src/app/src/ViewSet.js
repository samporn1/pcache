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
                <img src={`/api/sets/${setName}/${src}`} alt={src} />
              </Link>
            </div>
          ))}
        </div>
        <div className='mainImage'>
          <img src={`/api/sets/${setName}/${mainImage}`} alt={mainImage} />
        </div>
      </main>
    )
  }
}
