"""Digitize right waves from original mark with ring mask; hand-clean tip."""
from PIL import Image, ImageDraw
import numpy as np
from pathlib import Path
import json

OUT = Path(r"c:\Users\정명진\Documents\Project\인종_new\site\assets")
sym = Image.open(OUT / "wonum-symbol.png").convert("RGBA")
a = np.array(sym)
r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
h, w = al.shape
cx, cy = w // 2, h // 2

# ink: darker bronze
ink = (al > 40) & ((r.astype(int) + g + b) < 540)

yy, xx = np.ogrid[:h, :w]
# remove core
ink &= (xx - cx) ** 2 + (yy - cy) ** 2 > 22**2
# remove vertical axis band
ink &= np.abs(xx - cx) > 3
# remove ring-like pixels: high circularity residual
# keep only a horizontal corridor that widens slightly with |x|
corridor = np.abs(yy - cy) < (18 + 0.22 * np.abs(xx - cx))
waves = ink & corridor & (xx > cx + 20)

cols = {}
for y, x in zip(*np.where(waves)):
    cols.setdefault(int(x), []).append(int(y))

upper, lower = [], []
for x in sorted(cols):
    ys = np.array(sorted(cols[x]))
    # cluster by gap
    if len(ys) < 2:
        continue
    diffs = np.diff(ys)
    if diffs.max() >= 4:
        i = int(np.argmax(diffs))
        top, bot = ys[: i + 1], ys[i + 1 :]
        upper.append((x, float(np.median(top))))
        lower.append((x, float(np.median(bot))))
    else:
        # thick single stroke - take top and bottom of blob
        upper.append((x, float(ys.min())))
        lower.append((x, float(ys.max())))


def thin(pts, n):
    if len(pts) <= n:
        return pts
    idx = np.linspace(0, len(pts) - 1, n).astype(int)
    return [pts[i] for i in idx]


print("n upper", len(upper), "lower", len(lower))
u, l = thin(upper, 24), thin(lower, 24)
for p in u:
    print("U", tuple(round(v, 1) for v in p))
print("---")
for p in l:
    print("L", tuple(round(v, 1) for v in p))

dbg = sym.convert("RGB")
d = ImageDraw.Draw(dbg)
for x, y in upper:
    d.point((x, y), fill=(220, 40, 40))
for x, y in lower:
    d.point((x, y), fill=(40, 90, 220))
dbg.save(OUT / "_digitize_debug.png")

# Map to viewBox 640x440 (center 320,220): symbol is 660x450 center 330,225
# scale = 640/660, offset
sx, sy = 640 / 660, 440 / 450
ox, oy = 320 - 330 * sx, 220 - 225 * sy


def map_pt(p):
    return (round(p[0] * sx + ox, 1), round(p[1] * sy + oy, 1))


def catmull(pts):
    pts = [map_pt(p) for p in pts]
    # force start near core edge and tip meet
    d = [f"M{pts[0][0]} {pts[0][1]}"]
    ext = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(
            f"C{c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {p2[0]:.1f} {p2[1]:.1f}"
        )
    return " ".join(d), pts


pu, ku = catmull(thin(upper, 14))
pl, kl = catmull(thin(lower, 14))
print("\nRIGHT_A\n", pu)
print("\nRIGHT_B\n", pl)

# mirror
def mirror_path(pts):
    m = [(640 - x, y) for x, y in pts]
    d = [f"M{m[0][0]} {m[0][1]}"]
    ext = [m[0]] + m + [m[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(
            f"C{c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {p2[0]:.1f} {p2[1]:.1f}"
        )
    return " ".join(d)


print("\nLEFT_A\n", mirror_path(ku))
print("\nLEFT_B\n", mirror_path(kl))

# morph variants: nudge peaks
def nudge(pts, peak_dy, valley_dy):
    out = []
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        t = i / (n - 1)
        # peak influence early, valley mid
        w_peak = np.exp(-((t - 0.25) ** 2) / 0.03)
        w_val = np.exp(-((t - 0.35) ** 2) / 0.04)
        ny = y + peak_dy * w_peak + valley_dy * w_val
        # tip fixed
        if t > 0.9:
            ny = y + (ny - y) * (1 - (t - 0.9) / 0.1)
        out.append((x, round(ny, 1)))
    return out


def path_from(pts):
    d = [f"M{pts[0][0]} {pts[0][1]}"]
    ext = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(
            f"C{c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {p2[0]:.1f} {p2[1]:.1f}"
        )
    return " ".join(d)


ku2 = nudge(ku, -8, 0)
ku3 = nudge(ku, 5, 0)
kl2 = nudge(kl, 0, 7)
kl3 = nudge(kl, 0, -5)

data = {
    "right_a": pu,
    "right_a_alt": path_from(ku2),
    "right_a_alt2": path_from(ku3),
    "right_b": pl,
    "right_b_alt": path_from(kl2),
    "right_b_alt2": path_from(kl3),
    "left_a": mirror_path(ku),
    "left_a_alt": mirror_path(ku2),
    "left_a_alt2": mirror_path(ku3),
    "left_b": mirror_path(kl),
    "left_b_alt": mirror_path(kl2),
    "left_b_alt2": mirror_path(kl3),
}
(OUT / "wave-paths.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
print("wrote wave-paths.json")
