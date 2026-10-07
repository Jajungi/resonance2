"""Create high-contrast right-wave panel + grid for manual keypoint fitting."""
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from pathlib import Path

OUT = Path(r"c:\Users\정명진\Documents\Project\인종_new\site\assets")
img = Image.open(OUT / "wonum-symbol.png").convert("RGB")
w, h = img.size
cx, cy = w // 2, h // 2

# right panel
panel = img.crop((cx - 10, cy - 90, w, cy + 90))
pw, ph = panel.size
arr = np.array(panel)
# emphasize dark ink
lum = arr.mean(axis=2)
mask = lum < 195
vis = np.full_like(arr, 255)
vis[mask] = (40, 40, 40)
vis_img = Image.fromarray(vis)

# draw grid every 20px
d = ImageDraw.Draw(vis_img)
for x in range(0, pw, 20):
    d.line((x, 0, x, ph), fill=(220, 220, 220))
    d.text((x + 1, 2), str(cx - 10 + x), fill=(180, 80, 80))
for y in range(0, ph, 20):
    d.line((0, y, pw, ph if False else ph), fill=(230, 230, 230))
    abs_y = cy - 90 + y
    d.text((2, y + 1), str(abs_y), fill=(80, 80, 180))

vis_img = vis_img.resize((pw * 2, ph * 2), Image.NEAREST)
vis_img.save(OUT / "_grid_right.png")

# Also full symbol with vertical guides at candidate cross/tip
full = img.copy()
d2 = ImageDraw.Draw(full)
for x in [360, 380, 400, 420, 450, 480, 510, 540, 570, 600, 620, 640]:
    d2.line((x, cy - 80, x, cy + 80), fill=(255, 0, 0))
    d2.text((x, cy - 95), str(x), fill=(200, 0, 0))
d2.line((0, cy, w, cy), fill=(0, 120, 255))
full.save(OUT / "_guides.png")

# Sample ink y-bands at key x: find two densest clusters near midline
a = np.array(img.convert("RGBA"))
r, g, b, al = [a[:, :, i] for i in range(4)]
ink = (al > 20) & ((r.astype(int) + g + b) < 560)

print("x -> cluster means (near cy±90)")
for x in range(355, 650, 10):
    ys = np.where(ink[:, x])[0]
    ys = ys[(ys > cy - 90) & (ys < cy + 90)]
    if len(ys) == 0:
        print(x, "empty")
        continue
    # cluster
    groups = []
    cur = [ys[0]]
    for y in ys[1:]:
        if y - cur[-1] <= 2:
            cur.append(y)
        else:
            groups.append(cur)
            cur = [y]
    groups.append(cur)
    # filter tiny
    groups = [g for g in groups if len(g) >= 2]
    means = [round(float(np.mean(g)), 1) for g in groups]
    # also top/bottom of each
    spans = [(g[0], g[-1], round(float(np.mean(g)), 1), len(g)) for g in groups]
    print(x, spans)
