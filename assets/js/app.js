/* ==========================================================================
   app.js — routeri, ngjarjet dhe nisja e aplikacionit
   Rrugët:  #/  ·  #/produktet  ·  #/produktet/<kategoria>  ·  #/lista
            #/marketi  ·  #/p/<produkti>  (hap produktin mbi faqen aktuale)
   ========================================================================== */
(function (NTP) {
  'use strict';
  const { $, $$, List, toast, haptic, euro } = NTP;

  NTP.VERSION = '2026.11';

  const viewEl = () => $('#view');
  let currentBase = null;   // faqja poshtë sheet-it
  let sheetOpenedInApp = false;
  let installPrompt = null;

  /* ------------------------------------------------------------------ */
  /* Routeri                                                             */
  /* ------------------------------------------------------------------ */
  function parse(hash) {
    const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'home', arg: parts[1] || null };
  }

  const TITLES = {
    home: 'NTP Ratkoci, marketi në Ratkoc',
    produktet: 'Produktet',
    lista: 'Lista e blerjes',
    marketi: 'Orari dhe adresa',
  };

  function renderBase(route) {
    const key = `${route.name}/${route.arg || ''}`;
    if (currentBase === key) return false;
    const v = NTP.views;
    let html;
    switch (route.name) {
      case 'produktet': html = v.products(route.arg); break;
      case 'lista': html = v.list(); break;
      case 'marketi': html = v.store(); break;
      default: html = v.home(); route = { name: 'home' };
    }
    const el = viewEl();
    el.innerHTML = html;
    el.classList.remove('is-entering');
    void el.offsetWidth;
    el.classList.add('is-entering');
    currentBase = key;

    const navKey = route.name;
    $$('[data-nav]').forEach((a) => {
      const active = a.dataset.nav === navKey;
      a.classList.toggle('is-active', active);
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const cat = route.name === 'produktet' && NTP.category(route.arg);
    document.title = route.name === 'home' ? TITLES.home : `${cat ? cat.label : TITLES[route.name]} | NTP Ratkoci`;
    NTP.paintStatus();
    if (route.name === 'marketi') updateInstallRow();
    return true;
  }

  function onRoute() {
    const route = parse(location.hash);
    if (route.name === 'p') {
      const p = NTP.product(route.arg);
      if (!p) { location.replace('#/'); return; }
      if (!currentBase) renderBase({ name: 'home' });
      openSheet(p);
      return;
    }
    if (isSheetOpen()) closeSheetUI();
    const changed = renderBase(route);
    if (changed) {
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
      // fokusi për lexuesit e ekranit, pa lëvizur faqen
      $('#main').focus({ preventScroll: true });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Sheet-i i produktit                                                 */
  /* ------------------------------------------------------------------ */
  const sheet = () => $('#product-sheet');
  const isSheetOpen = () => !sheet().hidden;
  let sheetReturnFocus = null;

  function openSheet(p) {
    NTP.fillSheet(p);
    const el = sheet();
    if (el.hidden) {
      sheetReturnFocus = document.activeElement;
      el.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open')));
    }
    el.querySelector('.sheet-panel').scrollTop = 0;
    document.title = `${p.name}, ${euro(p.price)} | NTP Ratkoci`;
    setTimeout(() => el.querySelector('.sheet-panel').focus({ preventScroll: true }), 50);
  }

  function closeSheetUI() {
    const el = sheet();
    el.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { if (!el.classList.contains('is-open')) el.hidden = true; }, 320);
    if (sheetReturnFocus && sheetReturnFocus.focus && document.contains(sheetReturnFocus)) sheetReturnFocus.focus({ preventScroll: true });
  }

  function closeSheet() {
    if (sheetOpenedInApp) { sheetOpenedInApp = false; history.back(); return; }
    const base = currentBase ? currentBase.replace(/\/$/, '') : 'home';
    location.replace(base === 'home' ? '#/' : `#/${base}`);
  }

  /* ------------------------------------------------------------------ */
  /* Përditësimi kur ndryshon lista                                      */
  /* ------------------------------------------------------------------ */
  function refreshBadges() {
    const n = List.count();
    $$('[data-list-count]').forEach((b) => { b.hidden = n === 0; b.textContent = n > 99 ? '99+' : n; });
  }

  NTP.on('list', ({ id } = {}) => {
    refreshBadges();
    if (currentBase === 'lista/') { currentBase = null; renderBase({ name: 'lista' }); }
    const ids = id ? [id] : NTP.PRODUCTS.map((p) => p.id);
    ids.forEach((pid) => {
      $$(`[data-ctrl="${pid}"]`).forEach((el) => { el.innerHTML = NTP.control(pid); });
    });
    if (isSheetOpen()) {
      const r = parse(location.hash);
      const p = r.name === 'p' && NTP.product(r.arg);
      if (p) NTP.sheetActions(p);
    }
  });

  /* ------------------------------------------------------------------ */
  /* Klikimet (delegim)                                                  */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const t = e.target;

    const add = t.closest('[data-add]');
    if (add) {
      e.preventDefault();
      const p = NTP.product(add.dataset.add);
      List.add(p.id);
      haptic(12);
      $$('[data-list-count]').forEach((b) => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
      toast(`${p.name} u shtua në listë`, { icon: 'check', action: { label: 'Shiko listën', run: () => { location.hash = '#/lista'; } } });
      return;
    }
    const inc = t.closest('[data-inc]');
    if (inc) { e.preventDefault(); List.add(inc.dataset.inc); haptic(8); return; }
    const dec = t.closest('[data-dec]');
    if (dec) {
      e.preventDefault();
      const id = dec.dataset.dec;
      const before = List.qty(id);
      List.add(id, -1);
      haptic(8);
      if (before === 1) {
        const p = NTP.product(id);
        toast(`${p.name} u hoq nga lista`, { icon: 'trash', action: { label: 'Ktheje', run: () => List.set(id, 1) } });
      }
      return;
    }

    // linket e produkteve: mbaj mend që sheet-i u hap brenda aplikacionit
    const plink = t.closest('a[href^="#/p/"]');
    if (plink) {
      if (isSheetOpen()) { e.preventDefault(); location.replace(plink.getAttribute('href')); return; }
      sheetOpenedInApp = true;
      return;
    }

    if (t.closest('[data-open-search]')) { e.preventDefault(); NTP.openSearch(); return; }
    if (t.closest('[data-close-sheet]')) { e.preventDefault(); closeSheet(); return; }

    const sortLink = t.closest('a[data-sort]');
    if (sortLink) { NTP.catalog.sort = sortLink.dataset.sort; NTP.catalog.sub = null; currentBase = null; }

    const sub = t.closest('[data-sub]');
    if (sub) {
      NTP.catalog.sub = NTP.catalog.sub === sub.dataset.sub ? null : sub.dataset.sub;
      $$('[data-sub]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.sub === NTP.catalog.sub)));
      $('#grid').innerHTML = NTP.gridHTML();
      haptic(6);
      return;
    }

    const shareP = t.closest('[data-share-product]');
    if (shareP) {
      const p = NTP.product(shareP.dataset.shareProduct);
      NTP.share({ title: p.name, text: `${p.name}, ${euro(p.price)} te NTP Ratkoci`, url: location.href });
      return;
    }
    if (t.closest('[data-share-list]')) {
      NTP.share({ title: 'Lista ime te NTP Ratkoci', text: List.asText() });
      return;
    }
    if (t.closest('[data-clear-list]')) {
      const snap = List.snapshot();
      List.clear();
      toast('Lista u pastrua', { icon: 'trash', duration: 5000, action: { label: 'Ktheje', run: () => List.restore(snap) } });
      return;
    }

    const themeBtn = t.closest('[data-theme-set]');
    if (themeBtn) {
      NTP.setSetting('theme', themeBtn.dataset.themeSet);
      $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b === themeBtn)));
      return;
    }
    if (t.closest('[data-install]') && installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.finally(() => { installPrompt = null; updateInstallRow(); });
      return;
    }
    if (t.closest('[data-reset]')) {
      if (confirm('Të fshihen lista e blerjes dhe cilësimet në këtë pajisje?')) {
        ['ntp.list.v2', 'ntp.theme', 'ntp.haptic'].forEach((k) => NTP.storage.remove(k));
        location.reload();
      }
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-sort-select]')) {
      NTP.catalog.sort = e.target.value;
      $('#grid').innerHTML = NTP.gridHTML();
    }
    if (e.target.matches('[data-haptic-toggle]')) {
      NTP.setSetting('haptic', e.target.checked);
      haptic(20);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSheetOpen() && !NTP.isSearchOpen()) closeSheet();
  });

  /* koka merr vijë kur lëviz faqja */
  const topbar = $('.topbar');
  const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ------------------------------------------------------------------ */
  /* PWA                                                                 */
  /* ------------------------------------------------------------------ */
  function updateInstallRow() {
    const row = $('[data-install-row]');
    if (row) row.hidden = !installPrompt;
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; updateInstallRow(); });
  window.addEventListener('appinstalled', () => { installPrompt = null; updateInstallRow(); toast('Aplikacioni u instalua'); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          if (!w) return;
          w.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Ka version të ri', { icon: 'download', duration: 10000, action: { label: 'Rifresko', run: () => location.reload() } });
            }
          });
        });
      }).catch(() => {});
    });
  }

  /* ------------------------------------------------------------------ */
  /* Nisja                                                               */
  /* ------------------------------------------------------------------ */
  NTP.applyTheme();
  NTP.initSearch();
  refreshBadges();
  window.addEventListener('hashchange', onRoute);
  onRoute();
})(window.NTP);
