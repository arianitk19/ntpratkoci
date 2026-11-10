#!/usr/bin/env python3
"""
NTP Ratkoci — gjeneron asetet e optimizuara.

  python3 scripts/build-assets.py

- Images/*.jpg|png  ->  assets/img/products/<emri>.webp  (600x600, ~20-60 KB)
- Images/ntpratkoci.jpg -> assets/img/store-800.webp, store-1600.webp
- Ikonat e PWA -> assets/icons/

Kërkon: pip install pillow fonttools brotli
Fotot origjinale në Images/ mbeten burimi; shtoje një foto të re atje,
nise skriptin, pastaj shtoje produktin te assets/js/data/products.js.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Images"
OUT = ROOT / "assets" / "img" / "products"
ICONS = ROOT / "assets" / "icons"
FONT_WOFF2 = ROOT / "assets" / "fonts" / "archivo-wdth.woff2"

SIZE = 600
COBALT = (31, 75, 216)
YELLOW = (255, 212, 59)
INK = (16, 32, 74)

# Fotot që nuk janë produkte të katalogut (dyqani) trajtohen veçmas
SKIP = {"ntpratkoci.jpg"}


def is_flat_background(im: Image.Image) -> bool:
    """True kur skajet e fotos janë të bardha/transparente (foto produkti)."""
    rgba = im.convert("RGBA")
    w, h = rgba.size
    band = max(2, min(w, h) // 40)
    strips = [
        rgba.crop((0, 0, w, band)),
        rgba.crop((0, h - band, w, h)),
        rgba.crop((0, 0, band, h)),
        rgba.crop((w - band, 0, w, h)),
    ]
    for s in strips:
        alpha = s.getchannel("A")
        if ImageStat.Stat(alpha).mean[0] < 200:
            continue  # transparente -> e sheshtë
        rgb = s.convert("RGB")
        st = ImageStat.Stat(rgb)
        if min(st.mean) < 225 or max(st.stddev) > 18:
            return False
    return True


def content_bbox(mask: Image.Image):
    """Kufijtë e produktit, duke injoruar njollat e vogla (p.sh. watermark në cep)."""
    m = mask.filter(ImageFilter.MinFilter(5))  # heq pikat e vogla
    w, h = m.size
    data = m.load()
    cols = [sum(1 for y in range(0, h, 2) if data[x, y]) for x in range(w)]
    rows = [sum(1 for x in range(0, w, 2) if data[x, y]) for y in range(h)]
    cmin, rmin = max(2, h // 200), max(2, w // 200)
    xs = [x for x, c in enumerate(cols) if c >= cmin]
    ys = [y for y, c in enumerate(rows) if c >= rmin]
    if not xs or not ys:
        return None
    return (xs[0], ys[0], xs[-1] + 1, ys[-1] + 1)


def square(im: Image.Image) -> Image.Image:
    if is_flat_background(im):
        rgba = im.convert("RGBA")
        flat = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        flat.alpha_composite(rgba)
        # gjej kufijtë e produktit: pikselët që s'janë të bardhë
        diff = ImageChops.difference(flat.convert("RGB"), Image.new("RGB", rgba.size, "white"))
        mask = diff.convert("L").point(lambda v: 255 if v > 22 else 0)
        bbox = content_bbox(mask) or (0, 0, *rgba.size)
        rgba = flat.crop(bbox)
        pad = int(SIZE * 0.10)
        box = SIZE - 2 * pad
        scale = min(box / rgba.width, box / rgba.height)  # zmadhon edhe fotot e vogla
        rgba = rgba.resize((max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale))), Image.LANCZOS)
        canvas = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
        canvas.alpha_composite(rgba, ((SIZE - rgba.width) // 2, (SIZE - rgba.height) // 2))
        return canvas.convert("RGB")
    rgb = im.convert("RGB")
    w, h = rgb.size
    side = min(w, h)
    left, top = (w - side) // 2, (h - side) // 2
    return rgb.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)


def build_products():
    OUT.mkdir(parents=True, exist_ok=True)
    before = after = 0
    for f in sorted(SRC.iterdir()):
        if f.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"} or f.name in SKIP:
            continue
        name = f.stem.replace(" ", "-").lower() + ".webp"
        dest = OUT / name
        square(Image.open(f)).save(dest, "WEBP", quality=78, method=6)
        before += f.stat().st_size
        after += dest.stat().st_size
    print(f"produkte: {before/1e6:.1f} MB -> {after/1e6:.1f} MB")


def build_store():
    src = SRC / "ntpratkoci.jpg"
    if not src.exists():
        return
    im = Image.open(src).convert("RGB")
    # prerje 16:10 me fokus te raftet
    w, h = im.size
    ch = int(w * 10 / 16)
    top = max(0, min(h - ch, int(h * 0.22)))
    im = im.crop((0, top, w, top + ch))
    for width in (800, 1600):
        c = im.copy()
        c.thumbnail((width, width), Image.LANCZOS)
        c.save(ROOT / "assets" / "img" / f"store-{width}.webp", "WEBP", quality=74, method=6)


def load_font(size, wdth=125, wght=850):
    from fontTools.ttLib import TTFont
    import io
    tt = TTFont(str(FONT_WOFF2))
    tt.flavor = None
    buf = io.BytesIO()
    tt.save(buf)
    buf.seek(0)
    font = ImageFont.truetype(buf, size)
    try:
        font.set_variation_by_axes([wght, wdth])
    except Exception:
        pass
    return font


def fit_font(d, text, max_w, start, wdth=125, wght=850):
    size = start
    while size > 6:
        font = load_font(size, wdth, wght)
        tb = d.textbbox((0, 0), text, font=font)
        if tb[2] - tb[0] <= max_w:
            return font, tb
        size -= max(1, size // 40)
    return font, tb


def draw_icon(size: int, maskable: bool) -> Image.Image:
    """Ikona: etiketa e verdhë "NTP" sipër dhe "Ratkoci" e madhe poshtë, mbi blu."""
    s = size * 4  # supersampling
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle((0, 0, s, s), fill=COBALT)
        safe = 0.62   # zona e sigurt e ikonave maskable (rreth 80% diametri)
    else:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=COBALT)
        safe = 0.80
    box_w = int(s * safe)
    cx = s // 2

    # "Ratkoci" — emri, sa më i madh brenda zonës
    word, wb = fit_font(d, "Ratkoci", box_w, int(s * 0.3))
    ww, wh = wb[2] - wb[0], wb[3] - wb[1]

    # etiketa "NTP"
    tag_h = int(wh * 1.05)
    tfont, tb = fit_font(d, "NTP", 10 ** 6, int(tag_h * 0.62))
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    hole_r = int(tag_h * 0.10)
    pad_l, pad_r = int(tag_h * 0.52), int(tag_h * 0.26)
    tag_w = pad_l + tw + pad_r

    gap = int(wh * 0.32)
    total_h = tag_h + gap + wh
    top = (s - total_h) // 2

    tx0 = cx - tag_w // 2
    d.rounded_rectangle((tx0, top, tx0 + tag_w, top + tag_h), radius=int(tag_h * 0.18), fill=YELLOW)
    hx, hy = tx0 + int(tag_h * 0.26), top + tag_h // 2
    d.ellipse((hx - hole_r, hy - hole_r, hx + hole_r, hy + hole_r), fill=COBALT)
    d.text((tx0 + pad_l - tb[0], top + (tag_h - th) // 2 - tb[1]), "NTP", font=tfont, fill=INK)

    wy = top + tag_h + gap
    d.text((cx - ww // 2 - wb[0], wy - wb[1]), "Ratkoci", font=word, fill=(255, 255, 255))
    return img.resize((size, size), Image.LANCZOS)


def draw_favicon(size: int) -> Image.Image:
    """Favicon i vogël: vetëm etiketa, që lexohet edhe në 16 px."""
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=COBALT)
    font, tb = fit_font(d, "R", int(s * 0.6), int(s * 0.8))
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    d.text(((s - tw) // 2 - tb[0], (s - th) // 2 - tb[1]), "R", font=font, fill=YELLOW)
    return img.resize((size, size), Image.LANCZOS)


def build_icons():
    ICONS.mkdir(parents=True, exist_ok=True)
    draw_icon(192, False).save(ICONS / "icon-192.png")
    draw_icon(512, False).save(ICONS / "icon-512.png")
    draw_icon(512, True).save(ICONS / "maskable-512.png")
    draw_icon(180, True).convert("RGB").save(ICONS / "apple-touch-icon.png")
    draw_favicon(64).save(ICONS / "favicon-64.png")


if __name__ == "__main__":
    build_products()
    build_store()
    build_icons()
    print("gati")
