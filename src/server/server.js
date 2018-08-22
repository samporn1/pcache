const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs-extra')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const { URL } = require('url')
const uuidv1 = require('uuid/v1');

const app = express()

app.use((req, _, next) => {
  console.log(req.method, req.path)
  next()
})

app.get('/*.jpeg', async (req, res) => {
  res.set('Content-Type', 'image/jpeg')
  res.send(await fs.readFile('./bell.jpeg'))
})

app.get('/test', (req, res) => {
  res.send(
    `
    <!doctype html>

<html class="no-js" lang="en">

<body>
  <img src="https://cdn.shopify.com/s/files/1/0106/1162/1946/files/merchant_logo_240x.png?v=1530914681" />
  <img src="https://i.shgcdn.com/ad266b0e-a77b-4a4b-b41d-d6852a58609a/-/format/auto/-/preview/3000x3000/-/quality/lighter/" />
  <img src="https://i.shgcdn.com/a68aa80c-3cab-46bf-9cd0-3f43fe0fd745/-/format/auto/-/preview/3000x3000/-/quality/lighter/" />
  <img src="http://localhost:8090/image.jpeg" />
</body>

</html>
  `
  )
})

app.get('/api/sets', async (req, res) => {
  const content = await fs.readdir('./sets')
  res.json(content)
})

async function list(path) {
  try {
    return await fs.readdir(path)
  } catch (e) {
    return []
  }
}

async function readJson(path) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'))
  } catch (e) {
    return null
  }
}

app.get('/api/sets/:set', async (req, res) => {
  const { set } = req.params
  const sets = set.replace(/\$/g, '/')

  const content =(await list(`./sets/${sets}`)).filter(x => x !== 'images')
  const images = await list(`./sets/${sets}/images`)
  const def = await readJson(`./sets/${sets}/def.json`)

  res.json({ content, images, def })
})

app.get('/api/sets/:set/:image', async (req, res) => {
  const { set, image } = req.params
  const sets = set.replace(/\$/g, '/')
  const path = `./sets/${sets}/images/${image}`
  try {
    res.set('Content-Type', 'image')
    res.send(await fs.readFile(path))
  } catch (e) {
    res.status(500).json(e)
  }
})

app.get('/api/readImages', async (req, res) => {
  const { site, selector = 'img', method = 'attrib', mdata = 'src', npage = '', transform } = req.query
  // console.log(' { site, selector, method, mdata }:',  { site, selector, method, mdata })
  const mapF = (() => {
    switch(method) {

      case 'attrib':
      default:
        return (_, el) => el.attribs[mdata]
    }
  })()
  try {
    // a.data-page["next"]->href
    let allImages = []
    let pageUrl = site
    let pages = 20
    do {
      const html = await fetch(pageUrl).then(r => r.text())
      // const html = `<div><img src="cheese.com"></div>`
      const $ = cheerio.load(html)
      const srcList = $(selector).map(mapF).get()
      const images = srcList.map(x => new URL(x, site).toString())
      allImages = [...allImages, ...images]

      const [nextPageSelector, nextPageVal] = npage.split('->')
      pageUrl = null

      if (nextPageSelector && nextPageVal) {
        const nextPage = $(nextPageSelector).map((_, el) => el.attribs[nextPageVal]).get()[0]
        console.log('nextPage:', nextPage)
        pageUrl = nextPage
      }
      pages--

    } while (pageUrl && pages > 0)

    if (transform) {
      const [search, replaceValue, flags] = transform.split('|')
      try {
        const searchValue = new RegExp(search, flags)
        allImages = allImages.map(x => x.replace(searchValue, replaceValue))
      } catch (e) {

      }
    }

    res.json([...new Set(allImages)])
  } catch (e) {
    res.json([])
  }
})

app.put('/api/sets/:set', bodyParser.json({limit: '1000kb'}), async (req, res) => {
  const { set: setName } = req.params
  console.log('setName:', setName)
  const { images, def: { filter, hosts } } = req.body

  const folder = `./sets/${setName}`
  const imageFolder = `./sets/${setName}/images`

  try {
    await fs.ensureDir(folder)
    await fs.ensureDir(imageFolder)
    await fs.writeFile(
      `${folder}/def.json`,
      JSON.stringify(req.body, null, '  ')
    )
    for (image of images) {
      await readUrl(setName, image)
    }
    res.json({ done: true })
  } catch (e) {
    console.log('e:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/downloads', async (req, res) => {
  const downloads = JSON.parse(await fs.readFile('./data/downloads.json', 'utf8'))
  res.json(downloads)
})

app.post('/api/downloads', bodyParser.json({limit: '1000kb'}), async (req, res) => {
  const {state, urls} = req.body
  const { set } = state
  const downloads = urls.map(u => ({
    id: uuidv1(),
    url: u.url,
    set,
    name: u.name,
    state: 'paused',
  }))
  console.log('downloads:', downloads)

  let newDownloads
  try {
    const existig = JSON.parse(await fs.readFile('./data/downloads.json', 'utf8'))
    const existigUrls = existig.map(x => x.url)
    const newOnes = downloads.filter(x => !existigUrls.includes(x.url))


    newDownloads = [...existig, ...newOnes]
  } catch (e) {
    newDownloads = [...downloads]
  }
  await fs.writeFile('./data/downloads.json', JSON.stringify(newDownloads, null, '  '))

  res.send('Done')
})

app.patch('/api/downloads/:id', bodyParser.json({limit: '1000kb'}), async (req, res) => {
  const {state} = req.body
  const {id} = req.params

  const existig = JSON.parse(await fs.readFile('./data/downloads.json', 'utf8'))
  const download = existig.find(x => x.id === id)

  if (download) {
    download.state = state
    await fs.writeFile('./data/downloads.json', JSON.stringify(existig, null, '  '))
    await fs.ensureDir(`./sets/${download.set}/images`)

    await readUrl(download.set, {
      url: download.url,
      filename: download.name,
    })

    res.json(download)
  } else {
    res.status(404).json(null)
  }
})

const readUrl = async (setName, { url, filename }, ) => {
  let r = await fetch(url)
  if (r.ok) {
    let content = await r.buffer()
    const path = `./sets/${setName}/images/${filename}`
    await fs.writeFile(path, content)
    console.log('Writtin:', path)
  } else {
    throw `Error reading ${url}`
  }
}

app.use('/', express.static('./src/app/build'))

app.get('*', async (req, res) => {
  const template = await fs.readFile('./src/app/build/index.html')
  res.set('Content-Type', 'text/html')
  res.send(template)
})

const port = parseInt(process.env.PORT || '8090')
const address = process.env.address || '127.0.0.1'
app.listen(port, address, e => {
  if (e) console.error(`Error listening on ${address}:${port}`, e)
  else console.log("To feel the magic go to port", port, app.settings.env)
})

function clean (obj) {
  var cache = new Map()
  function o (x, path) {
    if (typeof x === 'object' && x !== null && x !== undefined) {
      const toRead = []
      const circular = {}
      Object.entries(x).forEach(([key, value]) => {
        if (typeof value === 'object' && cache.has(value)) {
          circular[key] = `[Circular:${cache.get(value)}]`
        } else {
          toRead.push({ key, value })
        }
      })
      return {
        ...toRead.reduce((p, { key, value }) => {
          const newPath = `${path}/${key}`
          cache.set(value, newPath)
          p[key] = o(value, newPath)

          return p
        }, {}),
        ...circular
      }
    } else {
      return x
    }
  }
  const res = o(obj, '.')
  cache = null // Enable garbage collection
  return res
}
