"""v5: tighter fit to original clusters. Separate tips."""
from PIL import Image, ImageDraw
import numpy as np
import re
from pathlib import Path

OUT = Path(r"c:\Users\정명진\Documents\Project\인종_new\site\assets")

# From column clusters (rings filtered). Cross ~455.
# A starts top → ends as shorter lower tip
# B starts bottom → ends as longer upper tip
A = [
    (352, 218),
    (362, 185),
    (372, 175),  # peak
    (390, 192),
    (410, 222),
    (430, 245),
    (455, 253),  # cross
    (475, 268),
    (495, 277),
    (515, 286),
    (535, 290),
    (555, 289),
    (570, 284),
    (582, 278),  # tip A
]
B = [
    (352, 232),
    (365, 255),
    (380, 268),
    (400, 270),
    (420, 266),
    (440, 258),
    (455, 253),  # cross
    (475, 243),
    (495, 238),
    (515, 239),
    (535, 245),
    (555, 255),
    (575, 264),
    (595, 269),
    (615, 270),
    (632, 269),  # tip B
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


def cubic(p0, p1, p2, p3, n=40):
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
        c1, c2 = (nums[i], nums[i + 1]), (nums[i + 2], nums[i + 3])
        p = (nums[i + 4], nums[i + 5])
        pts.extend(cubic(cur, c1, c2, p)[1:])
        cur = p
        i += 6
    return pts


def breathe(pts, s1, s2):
    """Nudge early lobe / post-cross lobe; freeze tips."""
    out = []
    n = len(pts) - 1
    for i, (x, y) in enumerate(pts):
        t = i / n
        if t > 0.88:
            out.append((x, y))
            continue
        w1 = float(np.exp(-((t - 0.15) ** 2) / 0.018))
        w2 = float(np.exp(-((t - 0.62) ** 2) / 0.025))
        out.append((x, round(y + s1 * w1 + s2 * w2, 1)))
    return out


pa, pb = catmull(A), catmull(B)
la, lb = catmull(mirror(A)), catmull(mirror(B))
pa2, pb2 = catmull(breathe(A, -7, 4)), catmull(breathe(B, 5, -5))
la2, lb2 = catmull(breathe(mirror(A), -7, 4)), catmull(breathe(mirror(B), 5, -5))

print("PA=" + pa)
print("PB=" + pb)
print("LA=" + la)
print("LB=" + lb)

base = Image.open(OUT / "wonum-symbol.png").convert("RGBA")
arr = np.array(base)
arr[:, :, 3] = (arr[:, :, 3] * 0.38).astype(np.uint8)
ov = Image.fromarray(arr).convert("RGB")
d = ImageDraw.Draw(ov)
for pt in parse(pa):
    d.ellipse((pt[0] - 1.2, pt[1] - 1.2, pt[0] + 1.2, pt[1] + 1.2), fill=(220, 35, 35))
for pt in parse(pb):
    d.ellipse((pt[0] - 1.2, pt[1] - 1.2, pt[0] + 1.2, pt[1] + 1.2), fill=(35, 95, 220))
d.ellipse((A[-1][0] - 4, A[-1][1] - 4, A[-1][0] + 4, A[-1][1] + 4), outline=(200, 0, 0), width=2)
d.ellipse((B[-1][0] - 4, B[-1][1] - 4, B[-1][0] + 4, B[-1][1] + 4), outline=(0, 70, 200), width=2)
ov.save(OUT / "_overlay_v5.png")

# write compare html + paths for site
(OUT / "wave-paths.json").write_text(
    __import__("json").dumps(
        {
            "right_a": pa,
            "right_b": pb,
            "left_a": la,
            "left_b": lb,
            "right_a_alt": pa2,
            "right_b_alt": pb2,
            "left_a_alt": la2,
            "left_b_alt": lb2,
        },
        indent=2,
        ensure_ascii=False,
    ),
    encoding="utf-8",
)
print("saved")
