/* ==========================================================================
   NTP Ratkoci — të dhënat e dyqanit dhe katalogu
   --------------------------------------------------------------------------
   Për të shtuar një produkt:
     1. Vendose foton në Images/ dhe nise: python3 scripts/build-assets.py
     2. Shto një rresht këtu: { name, price (në cent), cat, img (emri i fotos pa prapashtesë) }
   Çmimi shkruhet në cent: 0.70€ -> 70, 1.70€ -> 170.
   ========================================================================== */
(function () {
  'use strict';

  const STORE = {
    name: 'NTP Ratkoci',
    since: 1989,
    address: 'Rruga Safet Latifi, Ratkoc',
    landmark: 'përballë xhamisë',
    mapsUrl: 'https://maps.app.goo.gl/vyBb7QVEyuMP94HF9',
    timeZone: 'Europe/Belgrade', // ora e Kosovës
    // 0 = e diel ... 6 = e shtunë; [hapet, mbyllet] në orë/minuta
    hours: {
      0: ['08:00', '21:00'],
      1: ['08:00', '21:00'],
      2: ['08:00', '21:00'],
      3: ['08:00', '21:00'],
      4: ['08:00', '21:00'],
      5: ['08:00', '21:00'],
      6: ['08:00', '21:00'],
    },
  };

  const CATEGORIES = [
    { id: 'pijet', label: 'Pijet', icon: 'drink', filters: ['Gazuara', 'Lëngje', 'Energjike', 'Ujë'] },
    { id: 'snacks', label: 'Snacks', icon: 'chips', filters: ['Chips', 'Sticks', 'Kikirika', 'Smoka'] },
    { id: 'embelsira', label: 'Ëmbëlsira', icon: 'cookie', filters: ['Çokollata', 'Kek', 'Biskota'] },
  ];

  const RAW = {
    pijet: [
      ['Coca Cola', 70, 'Gazuara', 'cocacola'],
      ['Fanta Orange', 70, 'Gazuara', 'fantaorange1'],
      ['Fanta Exotic', 70, 'Gazuara', 'fantaexotic1'],
      ['Fanta Tropical', 70, 'Gazuara', 'fantatropical2'],
      ['Schweppes', 70, 'Gazuara', 'schweppes1'],
      ['Lemon Soda', 70, 'Gazuara', 'lemonsoda'],
      ['Golden Eagle', 50, 'Energjike', 'goldeneagle'],
      ['Lynx', 50, 'Energjike', 'lynx'],
      ['Jaffa Pjeshkë', 60, 'Lëngje', 'jaffapjeshke'],
      ['Jaffa Boronicë', 60, 'Lëngje', 'jaffaboronice1'],
      ['Sola Multivitamin', 80, 'Lëngje', 'sola'],
      ['Sola Ice Tea', 70, 'Lëngje', 'solaicetea'],
      ['Frostea', 60, 'Lëngje', 'frostea'],
      ['Jaffa 0.33l', 60, 'Lëngje', 'jaffa0.60'],
      ['Relax', 60, 'Lëngje', 'relax0.60'],
      ['Ujë Ana 0.5l', 25, 'Ujë', 'ujeana'],
      ['Ujë Sharri 0.5l', 25, 'Ujë', 'ujesharri'],
      ['Ujë Miros 0.5l', 25, 'Ujë', 'ujemiros'],
      ['Ujë Mineral', 40, 'Ujë', 'ujeanamineral'],
      ['Frutti Pjeshkë', 40, 'Lëngje', 'fruttipjeshke'],
      ['Jaffa', 25, 'Lëngje', 'jaffa0.25'],
      ['RC Cola', 40, 'Gazuara', 'rccola'],
      ['Red Rain', 30, 'Energjike', 'redrain'],
      ['Big Eagle', 30, 'Energjike', 'bigeagle1'],
      ['Coca Cola 2l', 170, 'Gazuara', 'cocacola2l'],
      ['Fanta 2l', 170, 'Gazuara', 'fanta1-2l'],
      ['Jaffa 1l', 130, 'Lëngje', 'jaffa1.5l'],
      ['Sola 1.5l', 140, 'Lëngje', 'sola2l'],
      ['Relax 1.5l', 110, 'Lëngje', 'relax2l'],
      ['Ujë Ana 1.5l', 50, 'Ujë', 'uje1.5lana'],
      ['Birrë Peja', 80, 'Gazuara', 'birrapeja'],
      ['Birrë Peja kanaçe', 100, 'Gazuara', 'kanaqe'],
    ],
    snacks: [
      ['Vipa Chips', 30, 'Chips', 'vipachips'],
      ['Vipa Maxxi', 30, 'Chips', 'vipamaxi'],
      ['Fripsy', 30, 'Sticks', 'fripsychicken'],
      ['Patos Rolls', 30, 'Chips', 'patosrolls'],
      ['Patos Tacos', 30, 'Chips', 'patostaco'],
      ['Patos', 40, 'Chips', 'patostacos'],
      ['Vipa Dinos', 30, 'Chips', 'vipadinos'],
      ['Vipa Sticks Chicken', 20, 'Sticks', 'vipasticks'],
      ['Vipa Sticks Hot Dog', 20, 'Sticks', 'vipahotdog'],
      ['Vipa Kikirik', 15, 'Sticks', 'vipakikirik'],
      ['Vipa Smoka', 15, 'Smoka', 'vipa0.15'],
      ['Funky', 30, 'Chips', 'funkyrotate'],
      ['Kikirika', 30, 'Kikirika', 'gonuts'],
      ['Eti Crax Sticks', 50, 'Sticks', 'eticrax'],
      ['Bambusa', 130, 'Kikirika', 'funkykikirik'],
      ['Opps BBQ', 30, 'Sticks', 'opps-bbq'],
      ['Opps Hot', 30, 'Sticks', 'oppshot'],
      ['Gold Snacks', 10, 'Smoka', 'goldysnacks1'],
    ],
    embelsira: [
      ['Pop Kek Çokollatë', 30, 'Çokollata', 'popkekqokollade'],
      ['Pop Kek Banane', 30, 'Çokollata', 'popkekbanane'],
      ['Pop Kek Kokos', 30, 'Çokollata', 'popkekcocos'],
      ['Alpella Çokollatë', 30, 'Çokollata', 'alpellaqokollad'],
      ['Alpella Çokollatë e bardhë', 30, 'Çokollata', 'alpellawhite'],
      ['Alpella Kek', 40, 'Kek', 'alpellacake'],
      ['Today Snowball', 30, 'Çokollata', 'todaysnowball'],
      ['Today Snowball White', 40, 'Çokollata', 'todaywhite'],
      ['Today Snowball Black', 30, 'Çokollata', 'todayblack'],
      ['Today Çokollatë', 30, 'Çokollata', 'todaycake'],
      ['Today Tiramisu', 40, 'Çokollata', 'todaytiramisu'],
      ['Today Panda', 30, 'Çokollata', 'todaypanda'],
      ['Today Pistachio', 40, 'Çokollata', 'todaypistachio'],
      ['Today Gusto', 40, 'Çokollata', 'todaygusto'],
      ['Today Soufflé', 40, 'Çokollata', 'todaysuffle'],
      ['Today Goldies', 30, 'Çokollata', 'todaygoldies'],
      ['Today Cup of Cake', 20, 'Kek', 'todaycupcake'],
      ['Today Cherry', 30, 'Çokollata', 'todaycherry'],
      ['Today Aloha', 20, 'Kek', 'todayaloha'],
      ['Topsa Love You', 70, 'Biskota', 'loveyou'],
      ['Today Roll', 20, 'Biskota', 'todayroll'],
      ['Figaro', 30, 'Biskota', 'figaro1'],
      ['Nuss', 20, 'Çokollata', 'nuss'],
    ],
  };

  // Produktet më të kërkuara (sipas id-së) — shfaqen në faqen kryesore
  const FEATURED = [
    'coca-cola', 'vipa-chips', 'today-tiramisu', 'golden-eagle',
    'patos', 'alpella-cokollate', 'sola-ice-tea', 'today-pistachio', 'fanta-orange', 'today-snowball',
  ];

  const slug = (s) => s.toLowerCase()
    .replace(/ë/g, 'e').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const PRODUCTS = [];
  const seen = new Set();
  Object.entries(RAW).forEach(([section, rows]) => {
    rows.forEach(([name, price, cat, img], order) => {
      let id = slug(name);
      while (seen.has(id)) id += '-2';
      seen.add(id);
      PRODUCTS.push({
        id, name, price, cat, section, order,
        img: `assets/img/products/${img}.webp`,
      });
    });
  });

  window.NTP = window.NTP || {};
  Object.assign(window.NTP, { STORE, CATEGORIES, PRODUCTS, FEATURED, slug });
})();
