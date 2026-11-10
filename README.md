# NTP Ratkoci

Katalogu online i marketit **NTP Ratkoci** (Rruga Safet Latifi, Ratkoc, që nga 1989):
çmimet e pijeve, snacks dhe ëmbëlsirave, lista e blerjes me total, orari live dhe adresa.
Punon si PWA: instalohet në telefon dhe hapet edhe pa internet.

## Struktura

```
index.html                 faqja (vetëm skeleti; pamjet krijohen nga JS)
manifest.json              PWA: emri, ikonat, shkurtoret
sw.js                      service worker (offline + cache)
assets/
  css/app.css              gjithë stili (tokenat e ngjyrave në fillim)
  js/data/products.js      ← KËTU ndryshon çmimet, produktet dhe orarin
  js/core.js               ndihmëse, lista e blerjes, cilësimet, toast
  js/status.js             hapur/mbyllur sipas orës së Kosovës
  js/views.js              pamjet: Fillimi, Produktet, Lista, Marketi
  js/search.js             kërkimi + përgjigjet e shpejta
  js/app.js                routeri dhe ngjarjet
  fonts/archivo-wdth.woff2 fonti Archivo (OFL), lokal
  icons/                   ikonat e aplikacionit
  img/products/*.webp      fotot e optimizuara (600×600)
  img/store-*.webp         foto e dyqanit
Images/                    fotot origjinale (burimi)
scripts/build-assets.py    gjeneron fotot WebP dhe ikonat nga Images/
```

## Ndryshimet e zakonshme

**Ndrysho një çmim**: hap `assets/js/data/products.js` dhe ndrysho numrin (në cent: `70` = 0.70 €).

**Shto një produkt**
1. Vendose foton në `Images/` (p.sh. `pepsi.jpg`).
2. `pip install pillow fonttools brotli` (vetëm herën e parë), pastaj `python3 scripts/build-assets.py`
3. Te `products.js` shto rreshtin: `['Pepsi', 70, 'Gazuara', 'pepsi'],`

**Pas çdo ndryshimi** rrite `VERSION` në `sw.js` (p.sh. `2026.11.2`), që telefonat ta marrin versionin e ri.

## Nisja lokale

Service worker-i kërkon server (jo `file://`):

```
python3 -m http.server 8080
```

pastaj hap http://localhost:8080

## Rrugët

`#/` fillimi · `#/produktet` · `#/produktet/pijet` · `#/lista` · `#/marketi` · `#/p/coca-cola` (lidhje direkte te produkti)
