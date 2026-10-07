from PIL import Image, ImageOps
import numpy as np

p = r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wonum-symbol-crop.png"
im = Image.open(p).convert("RGBA")
arr = np.array(im)
rgb = arr[..., :3].astype(np.float32)
a = arr[..., 3].astype(np.float32) / 255
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
ink = ((255 - lum) / 255.0) * a
mask = ink > 0.18
h, w = mask.shape
ys, xs = np.where(mask)
cx = (xs.min() + xs.max()) // 2
cy = (ys.min() + ys.max()) // 2
print("bbox center", cx, cy, "size", w, h)
print("extent x", xs.min(), xs.max(), "y", ys.min(), ys.max())

# core radius: filled disk around center
best_r = 0
for r in range(4, 60):
    yy, xx = np.ogrid[:h, :w]
    disk = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
    if mask[disk].mean() > 0.82:
        best_r = r
print("core radius", best_r)

profile = []
max_r = min(cx, w - cx, cy, h - cy) - 1
for r in range(0, max_r):
    vals = []
    for ang in np.linspace(0, 2 * np.pi, 96, endpoint=False):
        x = int(round(cx + r * np.cos(ang)))
        y = int(round(cy + r * np.sin(ang)))
        if 0 <= x < w and 0 <= y < h:
            vals.append(ink[y, x])
    profile.append(float(np.mean(vals)))
sm = np.convolve(np.array(profile), np.ones(5) / 5, mode="same")
peaks = []
for i in range(2, len(sm) - 2):
    if sm[i] > sm[i - 1] and sm[i] > sm[i + 1] and sm[i] > 0.1:
        peaks.append((i, round(float(sm[i]), 3)))
print("radial peaks", peaks[:25])

# diagonal-only profile (rings live in NE/NW/SE/SW, broken on axes)
diag = []
for r in range(0, max_r):
    vals = []
    for ang in (np.pi / 4, 3 * np.pi / 4, 5 * np.pi / 4, 7 * np.pi / 4):
        x = int(round(cx + r * np.cos(ang)))
        y = int(round(cy + r * np.sin(ang)))
        if 0 <= x < w and 0 <= y < h:
            vals.append(ink[y, x])
    diag.append(float(np.mean(vals)))
dsm = np.convolve(np.array(diag), np.ones(5) / 5, mode="same")
dpeaks = []
for i in range(2, len(dsm) - 2):
    if dsm[i] > dsm[i - 1] and dsm[i] > dsm[i + 1] and dsm[i] > 0.12:
        dpeaks.append((i, round(float(dsm[i]), 3)))
print("diagonal peaks", dpeaks[:25])

wave_top, wave_bot = [], []
for x in range(cx + best_r + 4, min(w - 1, cx + 220)):
    col = ink[:, x]
    ys_ink = np.where(col > 0.28)[0]
    ys_ink = ys_ink[(ys_ink > cy - 110) & (ys_ink < cy + 110)]
    if len(ys_ink) == 0:
        continue
    above = ys_ink[ys_ink < cy - 2]
    below = ys_ink[ys_ink > cy + 2]
    if len(above):
        wave_top.append((x - cx, int(above.min()) - cy, int(above.max()) - cy))
    if len(below):
        wave_bot.append((x - cx, int(below.min()) - cy, int(below.max()) - cy))
print("wave top every 10", wave_top[::10])
print("wave bot every 10", wave_bot[::10])
if wave_top:
    print("outer tip x", max(p[0] for p in wave_top + wave_bot))

line = Image.fromarray(((ink > 0.22) * 255).astype(np.uint8), "L")
ImageOps.invert(line).save(
    r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wonum-line.png"
)
print("saved line art")
