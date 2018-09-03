const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { URL } = require('url');

const downloads = require('./downloads');

const app = express();

app.use((req, _, next) => {
  console.log(req.method, req.path);
  next();
});

app.get('/*.jpeg', async (req, res) => {
  res.set('Content-Type', 'image/jpeg');
  res.send(await fs.readFile('./bell.jpeg'));
});

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
  );
});

app.get('/api/sets', async (req, res) => {
  const content = await fs.readdir('./sets');
  res.json(content);
});

async function list(path) {
  try {
    return await fs.readdir(path);
  } catch (e) {
    return [];
  }
}

async function readJson(path) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch (e) {
    return null;
  }
}

app.get('/api/sets/:set', async (req, res) => {
  const { set } = req.params;
  const sets = set.replace(/\$/g, '/');

  const content = (await list(`./sets/${sets}`)).filter(x => x !== 'images');
  const images = await list(`./sets/${sets}/images`);
  const def = await readJson(`./sets/${sets}/def.json`);

  res.json({ content, images, def });
});

app.get('/api/sets/:set/:image', async (req, res) => {
  const { set, image } = req.params;
  const sets = set.replace(/\$/g, '/');
  const path = `./sets/${sets}/images/${image}`;
  try {
    res.set('Content-Type', 'image');
    res.send(await fs.readFile(path));
  } catch (e) {
    res.status(500).json(e);
  }
});

app.get('/api/readImages', async (req, res) => {
  const {
    site,
    selector = 'img',
    method = 'attrib',
    mdata = 'src',
    npage = '',
    transform
  } = req.query;
  // console.log(' { site, selector, method, mdata }:',  { site, selector, method, mdata })
  const mapF = (() => {
    switch (method) {
      case 'attrib':
      default:
        return (_, el) => el.attribs[mdata];
    }
  })();
  try {
    // a.data-page["next"]->href
    let allImages = [];
    let pageUrl = site;
    let lastPage
    let pages = 20;
    do {
      const html = await fetch(pageUrl).then(r => r.text());
      // const html = `<div><img src="cheese.com"></div>`
      const $ = cheerio.load(html);
      const srcList = $(selector)
        .map(mapF)
        .get();
      const images = srcList.map(x => new URL(x, site).toString());
      allImages = [...allImages, ...images];

      const [nextPageSelector, nextPageVal] = npage.split('->');
      lastPage = pageUrl
      pageUrl = null;

      if (nextPageSelector && nextPageVal) {
        const nextPage = $(nextPageSelector)
          .map((_, el) => el.attribs[nextPageVal])
          .get()[0];
        const nextPageUrl = `${new URL(nextPage, lastPage)}`
        console.log('nextPageUrl:', nextPageUrl)
        pageUrl = nextPageUrl
      }
      pages--;
    } while (pageUrl && pages > 0);

    if (transform) {
      const [search, replaceValue, flags] = transform.split('|');
      try {
        const searchValue = new RegExp(search, flags);
        allImages = allImages.map(x => x.replace(searchValue, replaceValue));
      } catch (e) {}
    }

    res.json([...new Set(allImages)]);
  } catch (e) {
    res.json([]);
  }
});

app.post(
  '/api/sets',
  bodyParser.json({ limit: '1000kb' }),
  async (req, res) => {
    const {
      setName,
      images,
      def: { filter, hosts }
    } = req.body;

    const folder = `./sets/${setName}`;
    const imageFolder = `./sets/${setName}/images`;

    try {
      await fs.ensureDir(folder);
      await fs.ensureDir(imageFolder);
      await fs.writeFile(
        `${folder}/def.json`,
        JSON.stringify(req.body, null, '  ')
      );

      if (req.body.download) {
        downloads.addDownloads(setName, images);
        console.log('images:', images);
      } else {
        for (image of images) {
          await readUrl(setName, image);
        }
      }
      res.json({ done: true });
    } catch (e) {
      console.log('e:', e);
      res.status(500).json({ error: 'failed' });
    }
  }
);

downloads(app);

const readUrl = async (setName, { url, filename }) => {
  let r = await fetch(url);
  if (r.ok) {
    let content = await r.buffer();
    const path = `./sets/${setName}/images/${filename}`;
    await fs.writeFile(path, content);
    console.log('Writtin:', path);
  } else {
    throw `Error reading ${url}`;
  }
};

app.use('/', express.static('./src/app/build'));

app.get('*', async (req, res) => {
  const template = await fs.readFile('./src/app/build/index.html');
  res.set('Content-Type', 'text/html');
  res.send(template);
});

const port = parseInt(process.env.PORT || '8090');
const address = process.env.address || '127.0.0.1';
app.listen(port, address, e => {
  if (e) console.error(`Error listening on ${address}:${port}`, e);
  else console.log('To feel the magic go to port', port, app.settings.env);
});
