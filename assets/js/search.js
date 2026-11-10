/* ==========================================================================
   search.js — kërkimi i menjëhershëm + përgjigje të shpejta
   (zëvendëson "Asistentin AI": kupton pyetje si "a jeni hapur?",
    "ku ndodheni?", "më e lira pije", "snacks nën 0.30", "sa kushton fanta")
   ========================================================================== */
(function (NTP) {
  'use strict';
  const { $, esc, icon, euro, priceTag, norm, PRODUCTS, STORE } = NTP;

  const STOP = new Set(('a e i te të ne në me më per për sa kushton kushtojne cmim cmimi cmimet ben bën eshte është ' +
    'keni ka kemi jeni ju cfare çfare cka cili cila cilat cilet lutem pak ndonje ndonjë dua kam si edhe ose apo the ' +
    'qe që deri nen nën max maksimum euro eur cent centa me shume më shumë').split(' ').map(norm));

  const SECTION_WORDS = [
    [/\b(pij|leng|uje|uj|gazuar|energjik|birr)/, 'pijet'],
    [/\b(snack|chips|cips|smok|kikirik|stick|patatin)/, 'snacks'],
    [/\b(embelsir|sweet|cokollat|cokollad|kek|biskot|cokolat)/, 'embelsira'],
  ];

  let open = false;
  let selected = -1;
  let hits = [];
  let lastFocus = null;

  /* ---------------- Logjika ---------------- */
  function sectionFrom(q) {
    for (const [re, id] of SECTION_WORDS) if (re.test(q)) return id;
    return null;
  }

  function parseLimit(q) {
    const m = q.match(/(?:nen|deri ne|deri|max|me pak se|poshte)\s*(\d+(?:[.,]\d+)?)\s*(€|euro|eur|cent|c)?/);
    if (!m) return null;
    let v = parseFloat(m[1].replace(',', '.'));
    const unit = m[2] || '';
    if (unit.startsWith('c') || (!unit && v >= 5)) return Math.round(v);  // cent
    return Math.round(v * 100);                                           // euro
  }

  function score(p, tokens) {
    const name = norm(p.name);
    const hay = `${name} ${norm(p.cat)} ${norm(NTP.category(p.section).label)}`;
    let s = 0;
    for (const t of tokens) {
      if (!hay.includes(t)) {
        // tolerancë e vogël: fjala pa shkronjën e fundit (p.sh. "fantat" -> "fanta")
        if (t.length > 4 && hay.includes(t.slice(0, -1))) { s += 1; continue; }
        return 0;
      }
      s += name.startsWith(t) ? 6 : (name.includes(' ' + t) ? 4 : (name.includes(t) ? 3 : 1));
    }
    return s;
  }

  function understand(raw) {
    const q = norm(raw);
    if (!q) return { answer: null, items: [] };
    const st = NTP.status();
    const section = sectionFrom(q);
    const limit = parseLimit(q);
    const tokens = q.replace(/[?!.,€]/g, ' ').split(' ').filter((t) => t && !STOP.has(t) && !/^\d/.test(t));

    // pyetje për orarin
    if (/(hapur|mbyllur|orar|ora |\bora$|kur hap|kur mbyll|sa vone|deri ne sa|punoni)/.test(q)) {
      return {
        answer: `${st.open ? 'Po, jemi hapur tani.' : 'Tani jemi mbyllur.'} ${st.detail}. Orari: çdo ditë 08:00–21:00.`,
        icon: 'clock', items: [],
      };
    }
    // pyetje për vendndodhjen
    if (/(ku jeni|ku ndodh|ku eshte|adres|lokacion|maps|harte|rruga|si te vij|ku gjendet)/.test(q)) {
      return {
        answer: `Jemi në ${STORE.address}, ${STORE.landmark}. <a href="${STORE.mapsUrl}" target="_blank" rel="noopener">Hape në Google Maps</a>.`,
        html: true, icon: 'pin', items: [],
      };
    }
    if (/^(faleminderit|flm|rrofsh|thanks)/.test(q)) {
      return { answer: 'S’ka përse. Të presim në market!', icon: 'answer', items: [] };
    }
    if (/^(pershendetje|tung|tungjatjeta|miredita|miremengjes|hello|hi|ckemi|c'kemi)\b/.test(q)) {
      return { answer: 'Tungjatjeta! Shkruaj emrin e një produkti, ose pyet për orarin dhe vendndodhjen.', icon: 'answer', items: [] };
    }

    let pool = PRODUCTS.filter((p) => !section || p.section === section);
    const nameTokens = tokens.filter((t) => !SECTION_WORDS.some(([re]) => re.test(t)) &&
      !/^(lir|lira|lire|shtrenjt|shtrenjte|shtrenjta|cmimi?)$/.test(t) && !/^(lir|shtrenjt)/.test(t));

    // "më e lira" / "më e shtrenjta"
    const cheapest = /(lir[ae]?|lirat|lire)\b/.test(q);
    const priciest = /shtrenjt/.test(q);

    if (limit != null) pool = pool.filter((p) => p.price <= limit);

    let items;
    if (nameTokens.length) {
      items = pool.map((p) => ({ p, s: score(p, nameTokens) })).filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || a.p.price - b.p.price).map((x) => x.p);
    } else {
      items = pool.slice();
    }
    if (cheapest || limit != null) items.sort((a, b) => a.price - b.price);
    if (priciest) items.sort((a, b) => b.price - a.price);

    let answer = null;
    const where = section ? ` te ${NTP.category(section).label.toLowerCase()}` : '';
    if ((cheapest || priciest) && items.length) {
      const p = items[0];
      answer = `${cheapest ? 'Më e lira' : 'Më e shtrenjta'}${where} është ${p.name}, ${euro(p.price)}.`;
    } else if (limit != null) {
      answer = items.length
        ? `${items.length} produkte${where} deri në ${euro(limit)}.`
        : `Nuk kemi produkte${where} deri në ${euro(limit)}.`;
    } else if (/(sa kushton|sa ben|cmim|sa esht)/.test(q) && items.length) {
      const p = items[0];
      const others = items.slice(1, 3).filter((x) => norm(x.name).includes(nameTokens[0] || '~'));
      answer = `${p.name} kushton ${euro(p.price)}.` +
        (others.length ? ` Ka edhe ${others.map((x) => `${x.name} me ${euro(x.price)}`).join(' dhe ')}.` : '');
    }
    return { answer, icon: 'answer', items: items.slice(0, 30), tokens: nameTokens };
  }

  /* ---------------- Paraqitja ---------------- */
  function highlight(name, tokens = []) {
    const n = norm(name);
    if (n.length !== name.length || !tokens.length) return esc(name);
    const marks = new Array(name.length).fill(false);
    tokens.forEach((t) => {
      let i = n.indexOf(t);
      while (i !== -1) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = n.indexOf(t, i + t.length); }
    });
    let out = '', inMark = false;
    for (let i = 0; i < name.length; i++) {
      if (marks[i] && !inMark) { out += '<mark>'; inMark = true; }
      if (!marks[i] && inMark) { out += '</mark>'; inMark = false; }
      out += esc(name[i]);
    }
    return out + (inMark ? '</mark>' : '');
  }

  const SUGGESTIONS = ['A jeni hapur tani?', 'Ku ndodheni?', 'Sa kushton Coca Cola?', 'Më e lira pije', 'Snacks nën 0.30 €', 'Today'];

  function render(raw) {
    const box = $('#search-results');
    const q = raw.trim();
    selected = -1;
    if (!q) {
      hits = [];
      box.innerHTML = `<p class="search-hint">Shkruaj emrin e produktit ose bëj një pyetje.</p>
        <div class="suggest">${SUGGESTIONS.map((s) => `<button type="button" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
      return;
    }
    const r = understand(q);
    hits = r.items;
    const answer = r.answer
      ? `<div class="answer">${icon(r.icon || 'answer')}<p>${r.html ? r.answer : esc(r.answer)}</p></div>` : '';
    const list = hits.length
      ? `<div class="hits" role="listbox" aria-label="Produktet">${hits.map((p, i) => `
          <a class="hit" role="option" id="hit-${i}" href="#/p/${p.id}" aria-selected="false" data-hit="${i}">
            <img src="${p.img}" alt="" width="48" height="48" loading="lazy">
            <span><span class="hit-name">${highlight(p.name, r.tokens)}</span><br><span class="hit-cat">${esc(NTP.category(p.section).label)}, ${esc(p.cat)}</span></span>
            ${priceTag(p.price)}
          </a>`).join('')}</div>`
      : (r.answer ? '' : `<div class="empty" style="padding:32px 16px"><div class="empty-icon">${icon('search')}</div>
          <h2>S’u gjet “${esc(q)}”</h2><p>Kontrollo shkrimin, ose provo një fjalë më të shkurtër si “fanta” apo “chips”.</p></div>`);
    box.innerHTML = answer + list;
  }

  function select(i) {
    const els = NTP.$$('.hit');
    if (!els.length) return;
    selected = (i + els.length) % els.length;
    els.forEach((el, k) => el.setAttribute('aria-selected', String(k === selected)));
    els[selected].scrollIntoView({ block: 'nearest' });
    $('#search-input').setAttribute('aria-activedescendant', `hit-${selected}`);
  }

  /* ---------------- Hap / mbyll ---------------- */
  function openSearch(prefill = '') {
    if (open) return;
    open = true;
    lastFocus = document.activeElement;
    const el = $('#search');
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    const input = $('#search-input');
    input.value = prefill;
    render(prefill);
    input.focus();
  }

  function closeSearch() {
    if (!open) return;
    open = false;
    $('#search').hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function init() {
    const input = $('#search-input');
    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => render(input.value), 60); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(selected + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(selected - 1); }
      else if (e.key === 'Enter') {
        const i = selected >= 0 ? selected : (hits.length ? 0 : -1);
        if (i >= 0 && hits[i]) { closeSearch(); location.hash = `#/p/${hits[i].id}`; }
      }
    });
    $('#search').addEventListener('click', (e) => {
      if (e.target.id === 'search' || e.target.closest('[data-close-search]')) closeSearch();
      const sug = e.target.closest('[data-suggest]');
      if (sug) { input.value = sug.dataset.suggest; render(input.value); input.focus(); }
      if (e.target.closest('.hit')) closeSearch();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) { e.preventDefault(); closeSearch(); }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if (!open && !typing && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
        e.preventDefault(); openSearch();
      }
    });
  }

  Object.assign(NTP, { openSearch, closeSearch, initSearch: init, understand, isSearchOpen: () => open });
})(window.NTP);
