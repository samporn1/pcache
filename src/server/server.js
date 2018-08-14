const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs-extra')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const { URL } = require('url')

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

app.get('/api/sets/:set', async (req, res) => {
  const { set } = req.params
  try {
    const images = await fs.readdir(`./sets/${set}/images`)
    const def = JSON.parse(await fs.readFile(`./sets/${set}/def.json`, 'utf8'))
    res.json({ images, def })
  } catch (e) {
    res.status(500).json(e)
  }
})

app.get('/api/sets/:set/:image', async (req, res) => {
  const { set, image } = req.params
  console.log('image:', image)
  const path = `./sets/${set}/images/${image}`
  try {
    res.set('Content-Type', 'image')
    res.send(await fs.readFile(path))
  } catch (e) {
    res.status(500).json(e)
  }
})

app.get('/api/readImages', async (req, res) => {
  const { site } = req.query

  const html = await fetch(site).then(r => r.text())
  // const html = `<div><img src="cheese.com"></div>`
  const $ = cheerio.load(html)
  const srcList = $('img').map((_, el) => el.attribs.src).get()
  const images = srcList.map(x => new URL(x, site).toString())
  res.json(images)
})

app.put('/api/sets/:set', bodyParser.json(), async (req, res) => {
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

const readUrl = async (setName, { url, filename }) => {
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

app.use('/static', express.static('./src/app/build/static'))

app.get('*', async (req, res) => {
  const template = await fs.readFile('./src/app/build/index.html')
  res.set('Content-Type', 'text/html')
  res.send(template)
})

app.listen(8090)

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
