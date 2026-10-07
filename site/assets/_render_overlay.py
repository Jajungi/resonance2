"""Rasterize hand paths over symbol for visual check."""
from PIL import Image, ImageDraw
import numpy as np

OUT = r"c:\Users\정명진\Documents\Project\인종_new\site\assets"
base = Image.open(f"{OUT}/wonum-symbol.png").convert("RGBA")

# cubic bezier evaluate
def cubic(p0, p1, p2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def parse_path(d):
    # very simple M/C parser
    import re
    nums = [float(x) for x in re.findall(r"-?\d+\.?\d*", d)]
    pts = []
    i = 0
    # first M
    cur = (nums[0], nums[1])
    i = 2
    segs = [(cur,)]
    while i < len(nums):
        c1 = (nums[i], nums[i + 1])
        c2 = (nums[i + 2], nums[i + 3])
        p = (nums[i + 4], nums[i + 5])
        pts.extend(cubic(cur, c1, c2, p))
        cur = p
        i += 6
    return pts


# tuned v3 — match original eye + red character (tall hill, shallower valley)
A = """M352 220
C368 208, 382 162, 408 158
C430 155, 448 175, 464 200
C480 224, 496 240, 516 236
C538 230, 562 222, 588 220
C606 218, 624 222, 638 225"""

B = """M352 228
C366 244, 380 272, 406 274
C428 276, 446 255, 462 232
C478 210, 496 196, 516 200
C538 206, 562 216, 588 222
C606 224, 624 226, 638 225"""

img = base.copy()
# fade base
arr = np.array(img)
arr[:, :, 3] = (arr[:, :, 3] * 0.45).astype(np.uint8)
img = Image.fromarray(arr)
d = ImageDraw.Draw(img)
for pt in parse_path(A):
    x, y = pt
    d.ellipse((x - 1.2, y - 1.2, x + 1.2, y + 1.2), fill=(220, 40, 40, 255))
for pt in parse_path(B):
    x, y = pt
    d.ellipse((x - 1.2, y - 1.2, x + 1.2, y + 1.2), fill=(40, 100, 220, 255))
img.convert("RGB").save(f"{OUT}/_overlay_v3.png")
print("saved")
