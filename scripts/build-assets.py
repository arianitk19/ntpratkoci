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


def draw_icon(size: int, maskable: bool) -> Image.Image:
    s = size * 4  # supersampling
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle((0, 0, s, s), fill=COBALT)
        inset = int(s * 0.22)
    else:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=COBALT)
        inset = int(s * 0.14)
    # etiketa e verdhë e raftit me vrimë
    x0, y0, x1, y1 = inset, int(s * 0.30), s - inset, s - int(s * 0.30)
    if maskable:
        y0, y1 = int(s * 0.34), s - int(s * 0.34)
    r = int((y1 - y0) * 0.16)
    d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=YELLOW)
    hole = int((y1 - y0) * 0.10)
    hx, hy = x0 + int((y1 - y0) * 0.24), (y0 + y1) // 2
    d.ellipse((hx - hole, hy - hole, hx + hole, hy + hole), fill=COBALT)
    text = "NTP"
    avail = (x1 - int((y1 - y0) * 0.12)) - (hx + hole + int((y1 - y0) * 0.12))
    fs = int((y1 - y0) * 0.62)
    while True:
        font = load_font(fs)
        tb = d.textbbox((0, 0), text, font=font)
        if tb[2] - tb[0] <= avail or fs < 10:
            break
        fs -= max(1, fs // 30)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx = hx + hole + (x1 - (hx + hole) - tw) // 2 - tb[0]
    ty = (y0 + y1) // 2 - th // 2 - tb[1]
    d.text((tx, ty), text, font=font, fill=INK)
    return img.resize((size, size), Image.LANCZOS)


def build_icons():
    ICONS.mkdir(parents=True, exist_ok=True)
    draw_icon(192, False).save(ICONS / "icon-192.png")
    draw_icon(512, False).save(ICONS / "icon-512.png")
    draw_icon(512, True).save(ICONS / "maskable-512.png")
    draw_icon(180, True).convert("RGB").save(ICONS / "apple-touch-icon.png")
    draw_icon(64, False).save(ICONS / "favicon-64.png")


if __name__ == "__main__":
    build_products()
    build_store()
    build_icons()
    print("gati")
