/* ==========================================================================
   views.js — pamjet: Fillimi, Produktet, Lista, Marketi, dhe sheet-i i produktit
   ========================================================================== */
(function (NTP) {
  'use strict';
  const { $, esc, icon, euro, priceTag, List, STORE, CATEGORIES, PRODUCTS } = NTP;

  const SORTS = [
    ['default', 'Renditja e raftit'],
    ['price-asc', 'Më të lirat'],
    ['price-desc', 'Më të shtrenjtat'],
    ['name', 'Sipas emrit'],
  ];

  // gjendja e katalogut (ruhet gjatë sesionit)
  const catalog = { cat: 'all', sub: null, sort: 'default' };

  /* ------------------------------------------------------------------ */
  /* Komponentët                                                         */
  /* ------------------------------------------------------------------ */

  /** Butoni "+" ose numëruesi, sipas sasisë në listë. */
  function control(id, size = '') {
    const p = NTP.product(id);
    const q = List.qty(id);
    if (!q) {
      return size === 'lg'
        ? `<button class="btn btn-primary" type="button" data-add="${id}">${icon('plus')}Shto në listë</button>`
        : `<button class="add" type="button" data-add="${id}" aria-label="Shto ${esc(p.name)} në listë">${icon('plus')}</button>`;
    }
    return `<div class="stepper ${size ? 'stepper-' + size : ''}" role="group" aria-label="Sasia e ${esc(p.name)}">` +
      `<button type="button" data-dec="${id}" aria-label="Një më pak">${icon(q === 1 ? 'trash' : 'minus')}</button>` +
      `<output aria-live="polite">${q}</output>` +
      `<button type="button" data-inc="${id}" aria-label="Një më shumë">${icon('plus')}</button></div>`;
  }

  function card(p, { eager = false } = {}) {
    return `<article class="card" data-card="${p.id}">
      <a class="card-link" href="#/p/${p.id}" aria-label="${esc(p.name)}, ${esc(euro(p.price))}">
        <div class="card-media"><img src="${p.img}" alt="" width="300" height="300" ${eager ? '' : 'loading="lazy"'} decoding="async"></div>
      </a>
      <div class="card-body">
        <h3 class="card-name">${esc(p.name)}</h3>
        <div class="card-foot">${priceTag(p.price)}<span data-ctrl="${p.id}">${control(p.id)}</span></div>
      </div>
    </article>`;
  }

  const head = (title, sub) => `<header class="page-head"><h1 class="page-title">${esc(title)}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}</header>`;

  const empty = ({ ic, title, text, cta }) => `<div class="empty">
      <div class="empty-icon">${icon(ic)}</div>
      <h2>${esc(title)}</h2><p>${esc(text)}</p>
      ${cta ? `<a class="btn btn-primary" href="${cta.href}">${esc(cta.label)}</a>` : ''}
    </div>`;

  /* ------------------------------------------------------------------ */
  /* Fillimi                                                             */
  /* ------------------------------------------------------------------ */
  function home() {
    const featured = NTP.FEATURED.map(NTP.product).filter(Boolean);
    const cheap = PRODUCTS.filter((p) => p.price <= 30).sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)).slice(0, 10);

    const aisles = CATEGORIES.map((c) => {
      const items = PRODUCTS.filter((p) => p.section === c.id);
      const min = Math.min(...items.map((p) => p.price));
      const stack = items.slice(0, 3).map((p) => `<img src="${p.img}" alt="" width="64" height="64" loading="lazy">`).join('');
      return `<a class="aisle" href="#/produktet/${c.id}">
          <div>
            <h3 class="aisle-name">${esc(c.label)}</h3>
            <p class="aisle-meta">${items.length} produkte</p>
            <p class="aisle-from">nga ${priceTag(min)}</p>
          </div>
          <div class="aisle-stack" aria-hidden="true">${stack}</div>
        </a>`;
    }).join('');

    return `<div class="wrap">
      <section class="hero" aria-labelledby="hero-title">
        <div class="sign">
          <div class="sign-top">
            <span class="sign-since">Që nga ${STORE.since}</span>
            <span class="status" data-status="short"></span>
          </div>
          <h1 class="sign-title" id="hero-title"><span class="sign-small">NTP</span><span>Ratkoci</span></h1>
          <p class="sign-lede">Marketi i lagjes në Ratkoc. Shiko çmimet, bëj listën e blerjes dhe kalo të marrësh.</p>
          <button class="sign-search" type="button" data-open-search>${icon('search')}<span>Kërko Coca Cola, chips, kek…</span></button>
        </div>
        <figure class="storefront">
          <img src="assets/img/store-800.webp" srcset="assets/img/store-800.webp 800w, assets/img/store-1600.webp 1600w"
               sizes="(min-width: 900px) 45vw, 100vw" alt="Brendësia e marketit NTP Ratkoci, me raftet e pijeve" width="1600" height="1000" fetchpriority="high">
          <figcaption>
            <a class="chip-glass" href="${STORE.mapsUrl}" target="_blank" rel="noopener">${icon('pin')}${esc(STORE.address)}</a>
            <span class="chip-glass">${icon('clock')}08:00–21:00, çdo ditë</span>
          </figcaption>
        </figure>
      </section>

      <section class="section" aria-labelledby="h-aisles">
        <div class="section-head"><h2 class="h-section" id="h-aisles">Raftet</h2></div>
        <div class="aisles">${aisles}</div>
      </section>

      <section class="section" aria-labelledby="h-top">
        <div class="section-head">
          <h2 class="h-section" id="h-top">Më të kërkuarat</h2>
          <a class="section-link" href="#/produktet">Të gjitha ${icon('chevron')}</a>
        </div>
        <div class="rail">${featured.map((p) => card(p)).join('')}</div>
      </section>

      <section class="section" aria-labelledby="h-cheap">
        <div class="section-head">
          <h2 class="h-section" id="h-cheap">Deri në 30 cent</h2>
          <a class="section-link" href="#/produktet" data-sort="price-asc">Më të lirat ${icon('chevron')}</a>
        </div>
        <div class="rail">${cheap.map((p) => card(p)).join('')}</div>
      </section>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Produktet                                                           */
  /* ------------------------------------------------------------------ */
  function filtered() {
    let items = PRODUCTS.filter((p) => catalog.cat === 'all' || p.section === catalog.cat);
    if (catalog.sub) items = items.filter((p) => p.cat === catalog.sub);
    const s = catalog.sort;
    items = items.slice();
    if (s === 'price-asc') items.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    else if (s === 'price-desc') items.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    else if (s === 'name') items.sort((a, b) => a.name.localeCompare(b.name, 'sq'));
    return items;
  }

  function gridHTML() {
    const items = filtered();
    if (!items.length) {
      return empty({ ic: 'chips', title: 'Asnjë produkt këtu', text: 'Zgjidh një filtër tjetër ose shiko të gjitha produktet.' });
    }
    return `<p class="result-count">${items.length} produkte</p>
      <div class="grid">${items.map((p, i) => card(p, { eager: i < 4 })).join('')}</div>`;
  }

  function products(catId) {
    const valid = CATEGORIES.some((c) => c.id === catId);
    const nextCat = valid ? catId : 'all';
    if (nextCat !== catalog.cat) catalog.sub = null;
    catalog.cat = nextCat;
    const cat = NTP.category(catalog.cat);

    const tabs = [{ id: 'all', label: 'Të gjitha', icon: 'grid' }, ...CATEGORIES].map((c) =>
      `<a class="tab" href="#/produktet${c.id === 'all' ? '' : '/' + c.id}" aria-current="${c.id === catalog.cat}">${icon(c.icon)}${esc(c.label)}</a>`
    ).join('');

    const chips = cat ? cat.filters.map((f) =>
      `<button class="chip" type="button" data-sub="${esc(f)}" aria-pressed="${catalog.sub === f}">${esc(f)}</button>`
    ).join('') : '';

    const sorts = SORTS.map(([v, l]) => `<option value="${v}" ${catalog.sort === v ? 'selected' : ''}>${l}</option>`).join('');

    return `<div class="wrap">
      ${head(cat ? cat.label : 'Produktet', cat ? null : `${PRODUCTS.length} produkte në tre rafte`)}
      <div class="toolbar">
        <nav class="tabs" aria-label="Kategoritë">${tabs}</nav>
        <div class="toolbar-row">
          <div class="chips" role="group" aria-label="Filtro">${chips}</div>
          <label class="visually-hidden" for="sort">Rendit</label>
          <select class="sort" id="sort" data-sort-select>${sorts}</select>
        </div>
      </div>
      <div id="grid">${gridHTML()}</div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Lista                                                               */
  /* ------------------------------------------------------------------ */
  function list() {
    const entries = List.entries();
    if (!entries.length) {
      return `<div class="wrap">${head('Lista e blerjes')}
        <div style="margin-top:20px">${empty({
          ic: 'list', title: 'Lista është bosh',
          text: 'Shto produkte me butonin + dhe këtu të del totali para se të vish në market.',
          cta: { href: '#/produktet', label: 'Shfleto produktet' },
        })}</div></div>`;
    }
    const count = List.count();
    const lines = entries.map(({ p, qty }) => `<div class="line">
        <img src="${p.img}" alt="" width="56" height="56" loading="lazy">
        <div>
          <a class="line-name" href="#/p/${p.id}">${esc(p.name)}</a>
          <p class="line-unit">${esc(euro(p.price))} copa</p>
        </div>
        <div class="line-right">
          <span class="line-total">${esc(euro(p.price * qty))}</span>
          <span data-ctrl="${p.id}">${control(p.id)}</span>
        </div>
      </div>`).join('');

    return `<div class="wrap">
      ${head('Lista e blerjes', `${count} ${count === 1 ? 'artikull' : 'artikuj'}`)}
      <div class="list-layout">
        <div class="lines">${lines}</div>
        <aside class="receipt" aria-label="Totali">
          <div class="receipt-row"><span>Artikuj</span><span>${count}</span></div>
          <div class="receipt-total"><span>Gjithsej</span>${priceTag(List.total(), 'lg')}</div>
          <p class="receipt-note">Totali është orientues. Çmimi përfundimtar është ai në arkë.</p>
          <div class="receipt-actions">
            <button class="btn btn-primary btn-block" type="button" data-share-list>${icon('share')}Ndaj listën</button>
            <button class="btn btn-danger btn-block" type="button" data-clear-list>${icon('trash')}Pastro listën</button>
          </div>
        </aside>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Marketi                                                             */
  /* ------------------------------------------------------------------ */
  function store() {
    const s = NTP.status();
    const order = [1, 2, 3, 4, 5, 6, 0];
    const week = order.map((d) => {
      const h = STORE.hours[d];
      return `<li class="${d === s.day ? 'is-today' : ''}"><span>${NTP.DAYS[d]}${d === s.day ? ' (sot)' : ''}</span><span>${h ? `${h[0]}–${h[1]}` : 'Mbyllur'}</span></li>`;
    }).join('');

    const t = NTP.settings.theme;
    const seg = [['auto', 'Automatike'], ['light', 'E çelët'], ['dark', 'E errët']]
      .map(([v, l]) => `<button type="button" data-theme-set="${v}" aria-pressed="${t === v}">${l}</button>`).join('');

    return `<div class="wrap">
      ${head('Marketi', 'Orari, adresa dhe cilësimet e aplikacionit')}
      <div class="store-grid">
        <section class="panel" aria-labelledby="h-now">
          <h2 class="visually-hidden" id="h-now">Statusi</h2>
          <div class="now">
            <span class="status" data-status></span>
            <p class="now-detail" data-status-detail></p>
          </div>
          <div class="meter" aria-hidden="true"><i data-status-meter></i></div>
          <div class="meter-labels"><span>${s.from || ''}</span><span>${s.to || ''}</span></div>
        </section>

        <figure class="panel panel-photo" style="margin:0">
          <img src="assets/img/store-800.webp" srcset="assets/img/store-800.webp 800w, assets/img/store-1600.webp 1600w"
               sizes="(min-width: 900px) 50vw, 100vw" alt="Brendësia e marketit NTP Ratkoci" width="1600" height="1000" loading="lazy">
        </figure>

        <section class="panel" aria-labelledby="h-week">
          <h2 class="panel-title" id="h-week">Orari i javës</h2>
          <ul class="week">${week}</ul>
        </section>

        <section class="panel" aria-labelledby="h-where">
          <h2 class="panel-title" id="h-where">Ku jemi</h2>
          <p class="address">${esc(STORE.address)}</p>
          <p class="address-note">Në qendër të Ratkocit, ${esc(STORE.landmark)}.</p>
          <a class="btn btn-primary" href="${STORE.mapsUrl}" target="_blank" rel="noopener">${icon('nav')}Merr udhëzimet</a>
        </section>

        <section class="panel" aria-labelledby="h-settings">
          <h2 class="panel-title" id="h-settings">Cilësimet</h2>
          <div class="setting">
            <div><p class="setting-label">Pamja</p><p class="setting-help">Automatike ndjek telefonin</p></div>
            <div class="segmented" role="group" aria-label="Pamja">${seg}</div>
          </div>
          <div class="setting">
            <div><p class="setting-label" id="lbl-haptic">Dridhjet</p><p class="setting-help">Kur shton produkte në listë</p></div>
            <label class="switch"><input type="checkbox" data-haptic-toggle aria-labelledby="lbl-haptic" ${NTP.settings.haptic ? 'checked' : ''}><span></span></label>
          </div>
          <div class="setting" data-install-row hidden>
            <div><p class="setting-label">Instalo aplikacionin</p><p class="setting-help">Hape nga ekrani kryesor, edhe pa internet</p></div>
            <button class="btn btn-quiet" type="button" data-install>${icon('download')}Instalo</button>
          </div>
          <div class="setting">
            <div><p class="setting-label">Fshi të dhënat</p><p class="setting-help">Lista dhe cilësimet në këtë pajisje</p></div>
            <button class="btn btn-danger" type="button" data-reset>Fshi</button>
          </div>
          <p class="app-meta">NTP Ratkoci, versioni ${NTP.VERSION}</p>
        </section>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Sheet-i i produktit                                                 */
  /* ------------------------------------------------------------------ */
  function fillSheet(p) {
    const cat = NTP.category(p.section);
    $('#ps-img').src = p.img;
    $('#ps-img').alt = p.name;
    $('#ps-cat').innerHTML = `<a href="#/produktet/${cat.id}" style="text-decoration:none">${esc(cat.label)}</a> / ${esc(p.cat)}`;
    $('#ps-title').textContent = p.name;
    $('#ps-price').innerHTML = priceTag(p.price, 'xl');
    sheetActions(p);
    const related = PRODUCTS.filter((x) => x.section === p.section && x.id !== p.id)
      .sort((a, b) => (b.cat === p.cat) - (a.cat === p.cat) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
      .slice(0, 8);
    $('#ps-related').innerHTML = related.map((x) => card(x)).join('');
  }

  function sheetActions(p) {
    const q = List.qty(p.id);
    $('#ps-actions').innerHTML =
      `<span data-ctrl-lg="${p.id}" style="display:contents">${control(p.id, 'lg')}</span>` +
      (q ? `<a class="btn btn-quiet" href="#/lista">${icon('list')}Lista (${List.count()})</a>` : '') +
      `<button class="icon-btn" type="button" data-share-product="${p.id}" aria-label="Ndaj produktin">${icon('share')}</button>`;
  }

  Object.assign(NTP, {
    views: { home, products, list, store },
    catalog, gridHTML, control, card, fillSheet, sheetActions,
  });
})(window.NTP);
