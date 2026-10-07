"""Remove ring arcs from logo-mark; keep waves/core/axis/dots. Crop symbol."""
from PIL import Image
import numpy as np

SRC = r"C:\Users\정명진\Documents\Project\인간과 종교\app\client\public\logo-mark.png"
OUT_SYM = r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wonum-symbol.png"

im = Image.open(SRC).convert("RGBA")
arr = np.array(im).copy()
H, W = arr.shape[:2]
cx, cy = 512.0, 240.0

yy, xx = np.ogrid[:H, :W]
dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
# angle from east, degrees
ang = np.degrees(np.arctan2(-(yy - cy), xx - cx))

# wipe text
arr[460:, :] = [255, 255, 255, 255]

# Wave corridor: near horizontal axis, and tip regions
# |angle| < 28° from ±180/0, OR |x-cx| large with |y-cy| modest
wave = (np.abs(ang) <= 28) | (np.abs(ang) >= 152)
wave |= (np.abs(xx - cx) > 100) & (np.abs(yy - cy) < 95)

# Axis corridor
axis = np.abs(xx - cx) <= 5

# Anything ink-like in r=45..135 that is NOT in wave/axis corridor → erase (rings)
rgb = arr[..., :3].astype(np.float32)
alpha = arr[..., 3].astype(np.float32) / 255.0
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
ink = ((255 - lum) / 255.0) * alpha

ring_zone = (dist >= 42) & (dist <= 138)
erase = ring_zone & (~wave) & (~axis) & (ink > 0.1)
arr[erase] = [255, 255, 255, 255]

# also erase residual ring fragments still slightly off-horizontal
erase2 = ring_zone & (np.abs(ang) > 32) & (np.abs(ang) < 148) & (ink > 0.1) & (np.abs(xx - cx) < 110)
arr[erase2] = [255, 255, 255, 255]

out = Image.fromarray(arr)
lum2 = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
ink2 = ((255 - lum2.astype(np.float32)) / 255.0) * (arr[..., 3] / 255.0)
ys, xs = np.where(ink2 > 0.16)
pad = 18
box = (
    max(0, int(xs.min()) - pad),
    max(0, int(ys.min()) - pad),
    min(W, int(xs.max()) + pad),
    min(H, int(ys.max()) + pad),
)
sym = out.crop(box)
sym.save(OUT_SYM)
print("crop", box, "erased", int(erase.sum() + erase2.sum()))
