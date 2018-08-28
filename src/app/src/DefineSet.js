import React, { Component } from 'react';
import queryString from 'query-string';

import './DefineSet.css';

export class DefineSet extends Component {
  constructor(props) {
    super(props);

    this.imageSizes = [];
  }

  // com\/([a-z0-9-]+)     ${1}

  calcFileName(url, host, i, defaultNamePattern, nameFormat) {
    const pad = (n, i) => `0000000000${i}`.substr(n);

    try {
      const namePattern = host.namePattern || defaultNamePattern;

      const regexp = new RegExp(host.nameRegex);
      const fregexp = (() => {
        try {
          return new RegExp(nameFormat);
        } catch (e) {
          console.log('e:', e);
          return /.+/;
        }
      })();
      const matches = url.match(regexp);
      const pathname = new URL(url).pathname.replace(/\/?.*\//, '');
      const sufix = new URL(url).pathname.replace(/^.+\./, '');
      const prefix = new URL(url).pathname.replace(/\..+?$/, '');
      const fmatches = new URL(url).pathname.match(fregexp) || [];
      console.log('fmatches:', fmatches);
      const name = namePattern
        .replace(/\${([0-9]+)}/g, (_, n) => matches[parseInt(n, 10)])
        .replace(/\${i([0-9]*)}/g, (_, n) => pad(parseInt(n || '0', 10), i))
        .replace(/\${f([0-9]+)}/g, (_, n) => fmatches[parseInt(n, 10)])
        .replace(/\${f}/g, fmatches[0])
        .replace(/\${n}/g, pathname)
        .replace(/\${p}/g, prefix)
        .replace(/\${s}/g, sufix);

      return name; // { host, matches, name }
    } catch (e) {
      return e.toString();
    }
  }

  calcFileNames(images, hosts, defaultNamePattern, nameFormat) {
    return images.map((img, i) => {
      const filename = this.calcFileName(
        img.url,
        hosts.find(x => x.host === new URL(img.url).host),
        i + 1,
        defaultNamePattern,
        nameFormat
      );

      return {
        ...img,
        filename
      };
    });
  }

  componentWillMount() {
    const { location } = this.props;
    const search = queryString.parse(location.search);
    const { site } = search;

    const setName = site
      .replace(/https?:\/\//i, '')
      .replace(/[/.:]/gi, '-')
      .replace(/![a-z]/gi, '');

    this.props.setExternalState(
      {
        filter: this.props.externalState.filter || '',
        defaultNamePattern:
          this.props.externalState.defaultNamePattern || `\${i5}_\${n}`,
        setName
      },
      () => {
        this.readData();
      }
    );
  }

  componentDidUpdate() {
    this.readData();
  }

  async readData() {
    const {
      selector,
      site,
      method,
      mdata,
      npage,
      transform
    } = queryString.parse(this.props.location.search);
    const search = queryString.stringify({
      selector,
      site,
      method,
      mdata,
      npage,
      transform
    });

    const url = `/api/readImages?${search}`;

    if (this.currentUrl === url) return;

    const allImages = await fetch(url).then(r => r.json());
    const rawImages = allImages.map(url => ({ url }));
    const selectedImages = allImages;
    const selectedHosts = this.readHosts(allImages);
    const hosts = selectedHosts.map(host => ({
      host,
      nameRegex: '',
      namePattern: ''
    }));
    const { defaultNamePattern, nameFormat } = this.props.externalState;
    const images = this.calcFileNames(
      rawImages,
      hosts,
      defaultNamePattern,
      nameFormat
    );
    this.props.setExternalState(
      { images, selectedImages, hosts, selectedHosts },
      () => {
        this.currentUrl = url;
      }
    );
  }

  add(list, item) {
    const [key, value] = Object.entries(list)[0];
    const newValue = [...new Set(value).add(item)];
    this.props.setExternalState({ [key]: newValue });
  }

  remove(list, item) {
    const [key, value] = Object.entries(list)[0];
    const newValue = value.filter(x => x !== item);
    this.props.setExternalState({ [key]: newValue });
  }

  readHosts(images) {
    return [...new Set(images.map(x => new URL(x).host))];
  }

  go(setName, body) {
    this.props.setExternalState(
      {
        working: true
      },
      async () => {
        const url = `/api/sets/${setName}`;
        const r = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (r.ok) {
          // this.props.history.push('/viewSet/' + this.props.externalState.setName)
        } else {
          const err = await r.text();
          this.props.setExternalState({ stateError: err });
        }
      }
    );
  }

  setHostRegex(host, newVal) {
    const newHosts = this.props.externalState.hosts.map(x => ({ ...x }));
    const match = newHosts.find(x => x.host === host);
    match.nameRegex = newVal;
    const { images, defaultNamePattern, nameFormat } = this.props.externalState;
    const newImages = this.calcFileNames(
      images,
      newHosts,
      defaultNamePattern,
      nameFormat
    );
    this.props.setExternalState({ hosts: newHosts, images: newImages });
  }

  setHostPattern(host, newVal) {
    const newHosts = this.props.externalState.hosts.map(x => ({ ...x }));
    const match = newHosts.find(x => x.host === host);
    match.namePattern = newVal;
    const { images, defaultNamePattern, nameFormat } = this.props.externalState;
    const newImages = this.calcFileNames(
      images,
      newHosts,
      defaultNamePattern,
      nameFormat
    );
    this.props.setExternalState({ hosts: newHosts, images: newImages });
  }

  setDefaultNamePattern(defaultNamePattern) {
    const { images, hosts, nameFormat } = this.props.externalState;
    const newImages = this.calcFileNames(
      images,
      hosts,
      defaultNamePattern,
      nameFormat
    );
    this.props.setExternalState({ defaultNamePattern, images: newImages });
  }

  setNameFormat(nameFormat) {
    const { images, hosts, defaultNamePattern } = this.props.externalState;
    const newImages = this.calcFileNames(
      images,
      hosts,
      defaultNamePattern,
      nameFormat
    );
    this.props.setExternalState({ nameFormat, images: newImages });
  }

  measureImages() {
    if (this.measureImagesCallback) {
      clearTimeout(this.measureImagesCallback);
    }

    this.measureImagesCallback = setTimeout(() => {
      this.measureImagesCallback = null;
      if (Array.isArray(this.imageSizes)) {
        this.imageSizes.forEach(({ img, span }) => {
          const image = new Image();
          image.addEventListener('load', () => {
            span.innerHTML = `${image.width}x${image.height}`;
          });
          image.src = img.src;
        });
      }
    }, 10);
  }

  setImageSizeImg(el, i) {
    this.imageSizes[i] = this.imageSizes[i] || {};
    this.imageSizes[i].img = el;
    this.measureImages();
  }

  setImageSizeSpan(el, i) {
    this.imageSizes[i] = this.imageSizes[i] || {};
    this.imageSizes[i].span = el;
    this.measureImages();
  }

  render() {
    const images = [...(this.props.externalState.images || [])];
    if (!images) return <p>Reading...</p>;

    const {
      selectedImages = [],
      setName,
      filter = '',
      hosts = [],
      selectedHosts,
      stateError,
      defaultNamePattern,
      nameFormat
    } = this.props.externalState;
    const { history, location } = this.props;
    const {
      site,
      selector = 'img',
      method = 'attrib',
      mdata = 'src',
      npage,
      transform
    } = queryString.parse(location.search);

    const setSearch = val => {
      const parsed = queryString.parse(location.search);
      const mixed = { ...parsed, ...val };
      const search = queryString.stringify(mixed);
      const full = `${location.pathname}?${search}${
        location.hash ? `#${location.hash}` : ''
      }`;
      history.push(full);
    };

    const [filterRegex, filterError] = (() => {
      if (!filter.length) return [null, null];
      try {
        return [new RegExp(filter, 'i'), null];
      } catch (e) {
        return [null, `${e}`];
      }
    })();

    const errorMessage = filterError || stateError;

    const makeUrl = x => {
      try {
        return new URL(x);
      } catch (error) {
        return {};
      }
    };

    const hostMatches = i => selectedHosts.includes(makeUrl(i).host);

    const selectedResult = filterRegex
      ? selectedImages.filter(x => filterRegex.test(x)).filter(hostMatches)
      : selectedImages.filter(hostMatches);

    const body = {
      def: {
        setup: {
          site,
          selector,
          method,
          mdata,
          npage,
          transform,
          filter,
          defaultNamePattern,
          nameFormat
        },

        hosts: hosts.map(host => ({
          ...host,
          chosen: selectedHosts.includes(host.host)
        }))
      },
      images: images.filter(x => selectedResult.includes(x.url))
    };

    this.imageSizes = [];

    return (
      <div className="pageRoot">
        <header>
          <label className="topText">
            <p>Site:</p>
            <input
              value={site}
              onChange={e => setSearch({ site: e.target.value })}
            />
          </label>
          <label className="topText">
            <p>Selector:</p>
            <input
              value={selector}
              onChange={e => setSearch({ selector: e.target.value })}
            />
          </label>
          <label className="topText">
            <p>Method:</p>
            <input
              value={method}
              onChange={e => setSearch({ method: e.target.value })}
            />
          </label>
          <label className="topText">
            <p>MData:</p>
            <input
              value={mdata}
              onChange={e => setSearch({ mdata: e.target.value })}
            />
          </label>
          <label className="topText">
            <p>Next page:</p>
            <input
              value={npage}
              onChange={e => setSearch({ npage: e.target.value })}
            />
          </label>
          <label className="topText">
            <p>Transform:</p>
            <input
              value={transform || ''}
              onChange={e => setSearch({ transform: e.target.value })}
            />
          </label>
          <label className="topText">
            <p>Set name:</p>
            <input
              value={setName}
              onChange={e =>
                this.props.setExternalState({ setName: e.target.value })
              }
            />
          </label>
          <label className="topText">
            <p>Filter:</p>
            <input
              value={filter}
              onChange={e =>
                this.props.setExternalState({ filter: e.target.value })
              }
            />
          </label>
          <label className="topText">
            <p>Default name:</p>
            <input
              value={defaultNamePattern}
              onChange={e => this.setDefaultNamePattern(e.target.value)}
            />
          </label>
          <label className="topText">
            <p>NFormat:</p>
            <input
              value={nameFormat}
              onChange={e => this.setNameFormat(e.target.value)}
            />
          </label>
          <fieldset>
            <legend>Hosts</legend>
            <div className="hostList">
              {hosts.map(h => (
                <React.Fragment key={h.host}>
                  <div>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedHosts.includes(h.host)}
                        onChange={e => {
                          e.target.checked
                            ? this.add({ selectedHosts }, h.host)
                            : this.remove({ selectedHosts }, h.host);
                        }}
                      />
                      {h.host}
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="regex"
                    value={h.nameRegex}
                    onChange={e => this.setHostRegex(h.host, e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="pattern"
                    value={h.namePattern}
                    onChange={e => this.setHostPattern(h.host, e.target.value)}
                  />
                </React.Fragment>
              ))}
            </div>
          </fieldset>
        </header>
        <main>
          <ul className="imageGrid">
            {images.map((img, i) => (
              <li
                key={img.url}
                className={selectedResult.includes(img.url) ? 'in' : 'out'}
              >
                <div>In: {selectedResult.includes(img.url) ? '✓' : '✗'}</div>
                <div>{img.filename}</div>
                <div className="imageGrid-container">
                  <img
                    src={img.url}
                    alt=""
                    ref={el => this.setImageSizeImg(el, i)}
                  />
                </div>
                <input
                  type="checkbox"
                  checked={selectedImages.includes(img.url)}
                  onChange={e => {
                    e.target.checked
                      ? this.add({ selectedImages }, img.url)
                      : this.remove({ selectedImages }, img.url);
                  }}
                />
                <span ref={el => this.setImageSizeSpan(el, i)} />
              </li>
            ))}
          </ul>
          <input
            type="submit"
            value="Go"
            onClick={() => this.go(setName, body)}
          />
          {errorMessage && <div className="errorMessage">{errorMessage}</div>}
          <pre>body: {JSON.stringify(body, null, '  ')}</pre>
        </main>
      </div>
    );
  }
}
