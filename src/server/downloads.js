const bodyParser = require('body-parser');
const uuidv1 = require('uuid/v1');
const fs = require('fs-extra');
const fetch = require('node-fetch');

let downloads = [];

async function addDownloads(set, urls) {
  console.log('urls:', urls);
  const downloadUrls = urls.map(u => ({
    id: uuidv1(),
    url: u.url,
    set,
    name: u.filename,
    state: 'paused'
  }));

  const existigUrls = downloads.map(x => x.url);
  for (let u of downloadUrls) {
    const r = await fetch(u.url, {
      method: 'HEAD'
    });

    u.rsize = r.headers.get('content-length');
  }
  console.log('downloadUrls:', downloadUrls);
  const newOnes = downloadUrls.filter(x => !existigUrls.includes(x.url));
  console.log('newOnes:', newOnes);

  downloads = [...downloads, ...newOnes];

  await fs.writeFile(
    './data/downloads.json',
    JSON.stringify(downloads, null, '  ')
  );
}

async function getSize(download) {
  const path = `./sets/${download.set}/images/${download.name}`;
  try {
    const { size } = await fs.stat(path);
    download.size = size;
  } catch (e) {
    download.size = null;
  }

  if (
    download.state === 'downloading' &&
    `${download.size}` === `${download.rsize}`
  ) {
    download.state = 'done';
  }
}

module.exports = async app => {
  app.get('/api/downloads', async (req, res) => {
    await Promise.all(
      downloads.map(async download => {
        const path = `./sets/${download.set}/images/${download.name}`;
        try {
          const { size } = await fs.stat(path);
          download.size = size;
        } catch (e) {
          download.size = null;
        }

        if (
          download.state === 'downloading' &&
          `${download.size}` === `${download.rsize}`
        ) {
          download.state = 'done';
        }
      })
    );
    res.json(downloads);
  });

  app.post(
    '/api/downloads',
    bodyParser.json({ limit: '1000kb' }),
    async (req, res) => {
      const { state, urls } = req.body;
      const { set } = state;

      await addDownloads(set, urls);

      res.send('Done');
    }
  );

  app.post('/api/downloads/action/clear-complete', async (req, res) => {
    const mapped = await Promise.all(
      downloads.map(async download => {
        await getSize(download);

        return download;
      })
    );

    downloads = mapped.filter(x => x.state !== 'done');

    await fs.writeFile(
      './data/downloads.json',
      JSON.stringify(downloads, null, '  ')
    );
    res.json(downloads);
  });

  app.post(
    '/api/downloads/action/clear-selected',
    bodyParser.json(),
    async (req, res) => {
      console.log('req.body:', req.body.selected);
      downloads = downloads.filter(x => !req.body.selected.includes(x.id));

      await fs.writeFile(
        './data/downloads.json',
        JSON.stringify(downloads, null, '  ')
      );
      res.json(downloads);
    }
  );

  app.patch(
    '/api/downloads/n/:id',
    bodyParser.json({ limit: '1000kb' }),
    async (req, res) => {
      const { state } = req.body;
      const { id } = req.params;

      const existig = JSON.parse(
        await fs.readFile('./data/downloads.json', 'utf8')
      );
      const download = existig.find(x => x.id === id);

      if (download) {
        download.state = state;
        await fs.writeFile(
          './data/downloads.json',
          JSON.stringify(existig, null, '  ')
        );
        downloads = existig;
        await fs.ensureDir(`./sets/${download.set}/images`);

        await readUrl(download);
        await getSize(download);

        res.json(download);
      } else {
        res.status(404).json(null);
      }
    }
  );

  downloads = JSON.parse(await fs.readFile('./data/downloads.json', 'utf8'));
};

module.exports.addDownloads = async (set, urls) => {
  await addDownloads(set, urls);
};

const readUrl = async download => {
  const { set, url, name } = download;
  let r = await fetch(url);
  if (r.ok) {
    let content = await r.buffer();
    const path = `./sets/${set}/images/${name}`;
    await fs.writeFile(path, content);
    console.log('Writtin:', path);
  } else {
    throw `Error reading ${url}`;
  }
};
