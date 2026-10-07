"""Hand keypoints from original pixel clusters. Tips do NOT meet."""
from PIL import Image, ImageDraw
import numpy as np
import re
from pathlib import Path

OUT = Path(r"c:\Users\정명진\Documents\Project\인종_new\site\assets")

# Path A: starts UPPER → cross ~455 → continues as LOWER tip (shorter, lower)
# Path B: starts LOWER → cross ~455 → continues as UPPER tip (longer, higher)
A = [
    (352, 220),
    (365, 178),
    (378, 168),  # peak (taller lobe)
    (395, 185),
    (415, 220),
    (435, 245),
    (455, 252),  # cross
    (480, 270),
    (510, 285),
    (540, 291),
    (565, 286),
    (585, 278),
    (598, 274),  # tip A — stops earlier
]
B = [
    (352, 230),
    (365, 255),
    (380, 268),  # shallow valley
    (400, 270),
    (420, 266),
    (440, 258),
    (455, 252),  # cross
    (480, 242),
    (510, 238),
    (540, 245),
    (570, 260),
    (595, 268),
    (620, 270),
    (636, 269),  # tip B — longer, separate
]


def catmull(pts):
    d = [f"M{pts[0][0]} {pts[0][1]}"]
    ext = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(
            f"C{round(c1[0],1)} {round(c1[1],1)}, {round(c2[0],1)} {round(c2[1],1)}, {p2[0]} {p2[1]}"
        )
    return " ".join(d)


def mirror(pts):
    return [(660 - x, y) for x, y in pts]


def cubic(p0, p1, p2, p3, n=36):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        out.append((x, y))
    return out


def parse(d):
    nums = [float(x) for x in re.findall(r"-?\d+\.?\d*", d)]
    cur = (nums[0], nums[1])
    pts = [cur]
    i = 2
    while i < len(nums):
        c1 = (nums[i], nums[i + 1])
        c2 = (nums[i + 2], nums[i + 3])
        p = (nums[i + 4], nums[i + 5])
        pts.extend(cubic(cur, c1, c2, p)[1:])
        cur = p
        i += 6
    return pts


pa, pb = catmull(A), catmull(B)
print("A", pa)
print("B", pb)
print("ends", A[-1], B[-1], "gap y", A[-1][1] - B[-1][1], "gap x", B[-1][0] - A[-1][0])

base = Image.open(OUT / "wonum-symbol.png").convert("RGBA")
arr = np.array(base)
arr[:, :, 3] = (arr[:, :, 3] * 0.4).astype(np.uint8)
ov = Image.fromarray(arr).convert("RGB")
d = ImageDraw.Draw(ov)
for pt in parse(pa):
    d.ellipse((pt[0] - 1.3, pt[1] - 1.3, pt[0] + 1.3, pt[1] + 1.3), fill=(220, 40, 40))
for pt in parse(pb):
    d.ellipse((pt[0] - 1.3, pt[1] - 1.3, pt[0] + 1.3, pt[1] + 1.3), fill=(40, 100, 220))
# tip markers
d.ellipse((A[-1][0] - 5, A[-1][1] - 5, A[-1][0] + 5, A[-1][1] + 5), outline=(220, 0, 0), width=2)
d.ellipse((B[-1][0] - 5, B[-1][1] - 5, B[-1][0] + 5, B[-1][1] + 5), outline=(0, 80, 220), width=2)
ov.save(OUT / "_overlay_v4.png")
print("saved _overlay_v4.png")

# morph alts: breathe amplitude, keep tip endpoints fixed
def breathe(pts, peak_dy, valley_dy):
    out = []
    n = len(pts) - 1
    tip = pts[-1]
    for i, (x, y) in enumerate(pts):
        t = i / n
        if t >= 0.92:
            out.append((x, y))
            continue
        # peak influence early, valley around 0.2, post-cross secondary around 0.65
        w1 = np.exp(-((t - 0.18) ** 2) / 0.02)
        w2 = np.exp(-((t - 0.65) ** 2) / 0.03)
        # for A peak is negative y, for B valley positive y — caller passes signs
        ny = y + peak_dy * w1 + valley_dy * w2
        out.append((x, round(ny, 1)))
    out[-1] = tip
    return out


print("LA", catmull(mirror(A)))
print("LB", catmull(mirror(B)))
