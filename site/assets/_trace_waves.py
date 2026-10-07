"""Trace two horizontal wave strokes — allow non-mirror overlap."""
from PIL import Image, ImageDraw
import numpy as np

p = r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wonum-symbol-crop.png"
im = Image.open(p).convert("RGBA")
arr = np.array(im)
rgb = arr[..., :3].astype(np.float32)
a = arr[..., 3].astype(np.float32) / 255.0
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
ink = ((255 - lum) / 255.0) * a
# thinner strokes
mask = ink > 0.38
h, w = mask.shape
ys, xs = np.where(mask)
cx = (xs.min() + xs.max()) // 2
cy = (ys.min() + ys.max()) // 2
print("center", cx, cy)

# Right side only first: x from cx+20 to tip
right = []
for x in range(cx + 18, min(w - 1, cx + 140)):
    col = np.where(mask[:, x])[0]
    col = col[(col > cy - 105) & (col < cy + 105)]
    if len(col) == 0:
        continue
    clusters = []
    start = prev = int(col[0])
    for y in col[1:]:
        y = int(y)
        if y <= prev + 2:
            prev = y
        else:
            clusters.append((start, prev))
            start = prev = y
    clusters.append((start, prev))
    mids = [((a0 + b0) // 2) - cy for a0, b0 in clusters if b0 - a0 <= 7]
    # also allow slightly thicker metallic strokes
    if not mids:
        mids = [((a0 + b0) // 2) - cy for a0, b0 in clusters if b0 - a0 <= 12]
    if mids:
        right.append((x - cx, sorted(set(mids))))

print("--- right side stroke hits ---")
for dx, mids in right[::3]:
    print(f"  x=+{dx:3d}  y={mids}")

# Left side
left = []
for x in range(cx - 18, max(1, cx - 140), -1):
    col = np.where(mask[:, x])[0]
    col = col[(col > cy - 105) & (col < cy + 105)]
    if len(col) == 0:
        continue
    clusters = []
    start = prev = int(col[0])
    for y in col[1:]:
        y = int(y)
        if y <= prev + 2:
            prev = y
        else:
            clusters.append((start, prev))
            start = prev = y
    clusters.append((start, prev))
    mids = [((a0 + b0) // 2) - cy for a0, b0 in clusters if b0 - a0 <= 12]
    if mids:
        left.append((x - cx, sorted(set(mids))))

print("--- left side stroke hits ---")
for dx, mids in left[::3]:
    print(f"  x={dx:4d}  y={mids}")

# Save annotated debug image for right wave
dbg = im.copy()
draw = ImageDraw.Draw(dbg)
for dx, mids in right:
    for my in mids:
        draw.ellipse((cx + dx - 1, cy + my - 1, cx + dx + 1, cy + my + 1), fill=(255, 0, 0, 255))
for dx, mids in left:
    for my in mids:
        draw.ellipse((cx + dx - 1, cy + my - 1, cx + dx + 1, cy + my + 1), fill=(0, 0, 255, 255))
out = r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wonum-trace-debug.png"
dbg.save(out)
print("saved", out)
