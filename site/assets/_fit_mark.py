"""Trace only horizontal wave strokes from logo-mark.png; write overlay SVG."""
from PIL import Image, ImageDraw
import numpy as np
import math

SRC = r"C:\Users\정명진\Documents\Project\인간과 종교\app\client\public\logo-mark.png"
OUT_SVG = r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wonum-fitted.svg"
OUT_DBG = r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wonum-fit-debug.png"
OUT_HTML = r"C:\Users\정명진\Documents\Project\인종_new\site\assets\_compare.html"

im = Image.open(SRC).convert("RGBA")
W, H = im.size
arr = np.array(im)
rgb = arr[..., :3].astype(np.float32)
a = arr[..., 3].astype(np.float32) / 255.0
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
ink = ((255 - lum) / 255.0) * a
mask = ink > 0.30
mask[455:, :] = False  # drop text

cx, cy = 512, 240
# remove core disk
yy, xx = np.ogrid[:H, :W]
dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
mask[dist <= 20] = False

# remove concentric rings: kill ink whose radius is near known ring radii
RING_R = [52, 58, 63, 68, 78, 84, 95, 102, 110, 118, 125]
ring_kill = np.zeros_like(mask)
for r in RING_R:
    ring_kill |= np.abs(dist - r) <= 3.2
# but keep horizontal band extremes for waves (rings broken there anyway)
# Only kill ring pixels outside the wave "corridors" near horizontal?
# Safer: kill ring pixels when |angle from horizontal| > 25deg OR when in diagonal quads
ang = np.degrees(np.arctan2(cy - yy, xx - cx))  # 0 = east
# ring arcs live in diagonal sectors; waves live near horizontal
diag = (np.abs(np.abs(ang) - 45) < 28) | (np.abs(np.abs(ang) - 135) < 28)
mask[ring_kill & diag] = False
# also kill pure vertical axis area for wave tracking
mask[(np.abs(xx - cx) <= 3) & (dist > 22)] = False

# Find tip x: farthest ink in horizontal band
band = mask & (np.abs(yy - cy) < 100)
ys, xs = np.where(band)
print("wave band bbox", xs.min(), ys.min(), xs.max(), ys.max())
tip_r = int(xs[xs > cx].max())
tip_l = int(xs[xs < cx].min())
print("tips", tip_l, tip_r, "center", cx, cy)


def mids_at(x):
    col = np.where(mask[:, x])[0]
    col = col[(col > cy - 110) & (col < cy + 110)]
    if len(col) == 0:
        return []
    clusters = []
    s = p = int(col[0])
    for y in col[1:]:
        y = int(y)
        if y <= p + 2:
            p = y
        else:
            clusters.append((s + p) / 2)
            s = p = y
    clusters.append((s + p) / 2)
    # thin only
    return clusters


def track(x0, x1, step):
    xs = list(range(x0, x1, step))
    # collect all columns with 2 mids
    series = []
    for x in xs:
        m = sorted(mids_at(x))
        if len(m) >= 2:
            # take the two closest to a wave pair: prefer one above and one below cy if possible
            above = [v for v in m if v <= cy]
            below = [v for v in m if v >= cy]
            if above and below:
                series.append((x, above[-1], below[0]))
            else:
                # two nearest each other among m
                best = None
                for i in range(len(m) - 1):
                    gap = m[i + 1] - m[i]
                    if best is None or gap < best[0]:
                        best = (gap, m[i], m[i + 1])
                series.append((x, best[1], best[2]))
        elif len(m) == 1:
            series.append((x, m[0], m[0]))
    if not series:
        return None, None
    t1 = [(x, y1) for x, y1, y2 in series]
    t2 = [(x, y2) for x, y1, y2 in series]
    return t1, t2


r1, r2 = track(cx + 22, tip_r + 1, 1)
l1, l2 = track(cx - 22, tip_l - 1, -1)
print("right n", len(r1) if r1 else 0, len(r2) if r2 else 0)
print("left n", len(l1) if l1 else 0, len(l2) if l2 else 0)
if r1:
    print("right sample", r1[:: max(1, len(r1)//8)])
    print("right2 sample", r2[:: max(1, len(r2)//8)])


def simplify(pts, n=18):
    if len(pts) <= n:
        return pts
    idx = np.linspace(0, len(pts) - 1, n).astype(int)
    return [pts[i] for i in idx]


def to_path(pts, reverse=False):
    if reverse:
        pts = list(reversed(pts))
    pts = simplify(pts, 22)
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1 = pts[i]
        p2 = pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else pts[i + 1]
        c1x = p1[0] + (p2[0] - p0[0]) / 6
        c1y = p1[1] + (p2[1] - p0[1]) / 6
        c2x = p2[0] - (p3[0] - p1[0]) / 6
        c2y = p2[1] - (p3[1] - p1[1]) / 6
        d += f" C{c1x:.1f} {c1y:.1f}, {c2x:.1f} {c2y:.1f}, {p2[0]:.1f} {p2[1]:.1f}"
    return d


paths = []
for t, rev in ((r1, False), (r2, False), (l1, True), (l2, True)):
    if t and len(t) > 4:
        paths.append(to_path(t, reverse=rev))

# debug
dbg = im.copy()
draw = ImageDraw.Draw(dbg)
for t, col in ((r1, (220, 30, 30)), (r2, (30, 90, 220)), (l1, (20, 160, 60)), (l2, (220, 120, 20))):
    if not t:
        continue
    for x, y in t:
        draw.ellipse((x - 1.2, y - 1.2, x + 1.2, y + 1.2), fill=col)
dbg.save(OUT_DBG)

# core radius ~ visual ~ 18-22 (solid gold)
cr = 19
path_els = "\n".join(f'    <path d="{d}"/>' for d in paths)
svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" fill="none">
  <g stroke="#b08a45" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
{path_els}
  </g>
  <g stroke="#9a7340" stroke-width="1.7" stroke-linecap="round">
    <line x1="{cx}" y1="52" x2="{cx}" y2="{cy-cr-1}"/>
    <line x1="{cx}" y1="{cy+cr+1}" x2="{cx}" y2="428"/>
  </g>
  <g fill="#9a7340">
    <circle cx="{cx}" cy="40" r="3.1"/>
    <circle cx="{cx}" cy="26" r="2.5"/>
    <circle cx="{cx}" cy="14" r="1.9"/>
    <circle cx="{cx}" cy="440" r="3.1"/>
    <circle cx="{cx}" cy="454" r="2.5"/>
    <circle cx="{cx}" cy="466" r="1.9"/>
  </g>
  <circle cx="{cx}" cy="{cy}" r="{cr}" fill="#c4a06a"/>
</svg>
'''
open(OUT_SVG, "w", encoding="utf-8").write(svg)

html = '''<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"/><title>원음 비교</title>
<style>
body{margin:0;background:#111;color:#ddd;font-family:sans-serif}
h1{font-size:14px;margin:12px 16px}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:8px}
.card{background:#1c1c1c;padding:8px}
.card h2{font-size:12px;margin:0 0 8px;color:#aaa}
.stage{position:relative;width:100%;aspect-ratio:1024/640;background:#fff}
.stage img{position:absolute;inset:0;width:100%;height:100%}
</style></head><body>
<h1>원본 대비 — 가운데 겹침에서 빨간/파란 추적점이 파동을 따라가는지 확인</h1>
<div class="grid">
<div class="card"><h2>원본</h2><div class="stage"><img src="./wonum-mark.png"/></div></div>
<div class="card"><h2>원본 + SVG 겹침</h2><div class="stage">
<img src="./wonum-mark.png" style="opacity:.4"/>
<img src="./wonum-fitted.svg" style="opacity:.95"/>
</div></div>
<div class="card"><h2>추적 점(디버그)</h2><div class="stage"><img src="./wonum-fit-debug.png"/></div></div>
</div>
</body></html>
'''
open(OUT_HTML, "w", encoding="utf-8").write(html)
print("paths", len(paths))
print("saved svg/html/debug")
