/* ==========================================================================
   core.js — ndihmëse, ruajtja, gjendja (lista & cilësimet), toast
   ========================================================================== */
(function (NTP) {
  'use strict';

  /* ---------- DOM ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
  const icon = (name, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  /* ---------- Çmimet (në cent) ---------- */
  const euro = (cents) => (cents / 100).toFixed(2) + ' €';

  /** Etiketa e verdhë e çmimit. size: '' | 'lg' | 'xl' */
  const priceTag = (cents, size = '') => {
    const e = Math.floor(cents / 100);
    const c = String(cents % 100).padStart(2, '0');
    return `<span class="tag ${size ? 'tag-' + size : ''}" aria-label="${esc(euro(cents))}">` +
      `<span class="tag-e" aria-hidden="true">${e}</span>` +
      `<span class="tag-c" aria-hidden="true">${c}</span>` +
      `<span class="tag-cur" aria-hidden="true">€</span></span>`;
  };

  /* ---------- Normalizimi i tekstit për kërkim ---------- */
  const norm = (s) => String(s || '').toLowerCase()
    .replace(/ë/g, 'e').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();

  /* ---------- Ruajtja e sigurt ---------- */
  const storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* plot ose i bllokuar */ }
    },
    raw(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    remove(key) { try { localStorage.removeItem(key); } catch (e) {} },
  };

  /* ---------- Ngjarje të thjeshta ---------- */
  const listeners = {};
  const on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); };
  const emit = (evt, data) => (listeners[evt] || []).forEach((fn) => fn(data));

  /* ---------- Produktet ---------- */
  const byId = new Map(NTP.PRODUCTS.map((p) => [p.id, p]));
  const product = (id) => byId.get(id);
  const category = (id) => NTP.CATEGORIES.find((c) => c.id === id);

  /* ---------- Cilësimet ---------- */
  const settings = {
    theme: storage.raw('ntp.theme') ? storage.raw('ntp.theme').replace(/"/g, '') : 'auto',
    haptic: storage.get('ntp.haptic', true),
  };
  const media = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const applyTheme = () => {
    const t = settings.theme === 'auto' ? (media && media.matches ? 'dark' : 'light') : settings.theme;
    document.documentElement.dataset.theme = t;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0B1433' : '#EEF1F6');
  };
  if (media && media.addEventListener) media.addEventListener('change', applyTheme);

  const setSetting = (key, value) => {
    settings[key] = value;
    if (key === 'theme') { try { localStorage.setItem('ntp.theme', value); } catch (e) {} applyTheme(); }
    else storage.set('ntp.' + key, value);
    emit('settings', settings);
  };

  const haptic = (ms = 10) => {
    if (settings.haptic && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  };

  /* ---------- Lista e blerjes ---------- */
  const LIST_KEY = 'ntp.list.v2';
  const list = new Map(Object.entries(storage.get(LIST_KEY, {})).filter(([id, q]) => byId.has(id) && q > 0));

  // Migrimi: "të preferuarat" e versionit të vjetër bëhen artikuj në listë
  (function migrateWishlist() {
    const old = storage.get('ratkoci.wishlist', null);
    if (!Array.isArray(old) || !old.length) return;
    old.forEach((key) => {
      const name = String(key).split('__')[0];
      const p = NTP.PRODUCTS.find((x) => norm(x.name) === norm(name));
      if (p && !list.has(p.id)) list.set(p.id, 1);
    });
    storage.remove('ratkoci.wishlist');
    storage.set(LIST_KEY, Object.fromEntries(list));
  })();

  const List = {
    qty: (id) => list.get(id) || 0,
    set(id, qty) {
      qty = Math.max(0, Math.min(99, qty | 0));
      if (qty === 0) list.delete(id); else list.set(id, qty);
      storage.set(LIST_KEY, Object.fromEntries(list));
      emit('list', { id, qty });
    },
    add(id, n = 1) { this.set(id, this.qty(id) + n); },
    clear() { list.clear(); storage.set(LIST_KEY, {}); emit('list', {}); },
    entries: () => Array.from(list.entries()).map(([id, qty]) => ({ p: byId.get(id), qty })).filter((e) => e.p),
    count: () => Array.from(list.values()).reduce((a, b) => a + b, 0),
    total: () => Array.from(list.entries()).reduce((sum, [id, q]) => sum + (byId.get(id)?.price || 0) * q, 0),
    snapshot: () => new Map(list),
    restore(snap) { list.clear(); snap.forEach((q, id) => list.set(id, q)); storage.set(LIST_KEY, Object.fromEntries(list)); emit('list', {}); },
    asText() {
      const rows = this.entries().map(({ p, qty }) => `${qty} × ${p.name}  ${euro(p.price * qty)}`);
      return `Lista ime te NTP Ratkoci\n\n${rows.join('\n')}\n\nGjithsej: ${euro(this.total())}`;
    },
  };

  /* ---------- Toast ---------- */
  const toast = (message, opts = {}) => {
    const box = $('#toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon(opts.icon || 'check')}<span>${esc(message)}</span>` +
      (opts.action ? `<button type="button">${esc(opts.action.label)}</button>` : '');
    if (opts.action) {
      el.querySelector('button').addEventListener('click', () => { opts.action.run(); dismiss(); });
    }
    while (box.children.length >= 2) box.firstElementChild.remove();
    box.appendChild(el);
    let gone = false;
    function dismiss() {
      if (gone) return; gone = true;
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 260);
    }
    setTimeout(dismiss, opts.duration || 2600);
  };

  /* ---------- Ndarja ---------- */
  const share = async ({ title, text, url }) => {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return true; } catch (e) { return false; }
    }
    try {
      await navigator.clipboard.writeText([text, url].filter(Boolean).join('\n'));
      toast('U kopjua. Ngjite ku të duash.', { icon: 'check' });
      return true;
    } catch (e) {
      toast('Ndarja nuk funksionon në këtë shfletues.', { icon: 'x' });
      return false;
    }
  };

  Object.assign(NTP, {
    $, $$, esc, icon, euro, priceTag, norm, storage, on, emit,
    product, category, settings, setSetting, applyTheme, haptic, List, toast, share,
  });
})(window.NTP);
