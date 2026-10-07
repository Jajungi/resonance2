"""Extract main stroke polylines from wonum line art for SVG matching."""
from PIL import Image
import numpy as np

p = r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wonum-symbol-crop.png"
im = Image.open(p).convert("RGBA")
arr = np.array(im)
rgb = arr[..., :3].astype(np.float32)
a = arr[..., 3].astype(np.float32) / 255.0
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
ink = ((255 - lum) / 255.0) * a

# stronger threshold + thin
mask = ink > 0.35
h, w = mask.shape
ys, xs = np.where(mask)
cx = (xs.min() + xs.max()) // 2
cy = (ys.min() + ys.max()) // 2
print("center", cx, cy)

# Sample upper-right wave: for x from cx+25 to tip, find uppermost ink y
pts = []
for x in range(cx + 22, min(w - 2, cx + 140)):
    col = np.where(mask[:, x])[0]
    col = col[(col > cy - 120) & (col < cy - 3)]
    if len(col):
        pts.append((x - cx, int(col.min()) - cy))
print("UR wave upper edge:", pts[::5])

pts2 = []
for x in range(cx + 22, min(w - 2, cx + 140)):
    col = np.where(mask[:, x])[0]
    col = col[(col > cy + 3) & (col < cy + 120)]
    if len(col):
        pts2.append((x - cx, int(col.max()) - cy))
print("LR wave lower edge:", pts2[::5])

# ring radii via diagonal
for ang_deg in (45,):
    ang = np.deg2rad(ang_deg)
    hits = []
    for r in range(15, 200):
        x = int(round(cx + r * np.cos(ang)))
        y = int(round(cy - r * np.sin(ang)))
        if not (0 <= x < w and 0 <= y < h):
            break
        if mask[y, x]:
            if not hits or r - hits[-1] > 4:
                hits.append(r)
    print("NE diagonal ink radii", hits)

# core: filled circle radius
for r in range(5, 40):
    yy, xx = np.ogrid[:h, :w]
    disk = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
    # ignore texture holes: use ink mean
    if ink[disk].mean() < 0.25:
        print("core soft radius ~", r - 1)
        break
