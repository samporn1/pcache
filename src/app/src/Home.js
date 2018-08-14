import React, { Component } from 'react'
import { Link } from 'react-router-dom'

export class Home extends Component {
  constructor (props) {
    super(props)
    this.state = { allSets: [] }
  }

  async componentWillMount () {
    const url = '/api/sets'
    const allSets = await fetch(url).then(r => r.json())
    this.setState({ allSets })
  }

  readImagesFrom () {
    const { readImagesFromSite } = this.state
    const { history } = this.props
    history.push('/define-set?site=' + readImagesFromSite)
  }

  render () {
    const { readImagesFromSite, allSets } = this.state

    return (
      <div>
        Read images from:
        <form
          onSubmit={e => {
            e.preventDefault()
            this.readImagesFrom(readImagesFromSite)
          }}
        >
          <input
            onChange={e =>
              this.setState({ readImagesFromSite: e.target.value })}
          />
          <input type='submit' value='Go' />
        </form>
        <hr />
        <h2>Sets</h2>
        <ul>
          {allSets.map(set => (
            <li>
              <Link to={`/set/${set}`}>{set}</Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}
