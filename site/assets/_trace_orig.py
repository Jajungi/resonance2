"""Trace original right-side waves: two separate tips that do NOT meet."""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from pathlib import Path
import json
import re

OUT = Path(r"c:\Users\정명진\Documents\Project\인종_new\site\assets")
img = Image.open(OUT / "wonum-symbol.png").convert("RGBA")
a = np.array(img)
r, g, b, al = [a[:, :, i].astype(np.int16) for i in range(4)]
h, w = al.shape
cx, cy = w // 2, h // 2
print("size", w, h, "center", cx, cy)

# ink mask: bronze on light bg
lum = (r + g + b) / 3
ink = (al > 20) & (lum < 210) & (r > 90)

# zoom tip region for inspection
tip = img.crop((w - 180, cy - 40, w - 5, cy + 40))
tip.save(OUT / "_tip_zoom.png")

# For each x from core+r to tip, find wave ink y's in horizontal band
core_r = 22
xs_range = range(cx + core_r + 2, w - 2)

# Build vertical profiles
profiles = {}
for x in xs_range:
    col = ink[:, x]
    ys = np.where(col)[0]
    # keep near horizontal mid ±120
    ys = ys[(ys > cy - 120) & (ys < cy + 120)]
    if len(ys) == 0:
        continue
    # remove ring: rings have sparse circular hits — keep densest clusters near mid
    profiles[x] = ys

# Track two ribbons using continuity from start
# At start (near core), expect two blobs above/below mid
x0 = cx + core_r + 4
ys0 = profiles.get(x0, np.array([]))
print("start x", x0, "ys sample", ys0[:20], "...", len(ys0))

# Use morphological approach: for each x, take top edge of upper ribbon and bottom of lower
# Better: find connected components per column as clusters


def clusters(ys, gap=3):
    if len(ys) == 0:
        return []
    ys = np.sort(ys)
    groups = [[ys[0]]]
    for y in ys[1:]:
        if y - groups[-1][-1] <= gap:
            groups[-1].append(y)
        else:
            groups.append([y])
    return [(g[0], g[-1], float(np.mean(g))) for g in groups]


# Seed upper/lower from early columns
upper_pts = []
lower_pts = []
prev_u, prev_l = None, None

for x in xs_range:
    cl = clusters(profiles.get(x, np.array([])), gap=2)
    if not cl:
        continue
    # filter out ring fragments far from expected track
    if prev_u is None:
        # take two clusters closest to cy, one above one below if possible
        above = [c for c in cl if c[2] <= cy + 5]
        below = [c for c in cl if c[2] >= cy - 5]
        if above and below:
            u = min(above, key=lambda c: abs(c[2] - (cy - 20)))
            l = min(below, key=lambda c: abs(c[2] - (cy + 20)))
            # centerline of each stroke
            prev_u = (u[0] + u[1]) / 2
            prev_l = (l[0] + l[1]) / 2
            upper_pts.append((x, prev_u))
            lower_pts.append((x, prev_l))
        continue

    # assign clusters to nearest track
    # prefer cluster whose mean is near prev
    best_u, best_l = None, None
    for c in cl:
        mid = (c[0] + c[1]) / 2
        du = abs(mid - prev_u)
        dl = abs(mid - prev_l)
        if du < dl:
            if best_u is None or du < abs(((best_u[0] + best_u[1]) / 2) - prev_u):
                if du < 28:
                    best_u = c
        else:
            if best_l is None or dl < abs(((best_l[0] + best_l[1]) / 2) - prev_l):
                if dl < 28:
                    best_l = c
    if best_u is not None:
        prev_u = (best_u[0] + best_u[1]) / 2
        upper_pts.append((x, prev_u))
    if best_l is not None:
        prev_l = (best_l[0] + best_l[1]) / 2
        lower_pts.append((x, prev_l))

print("tracked", len(upper_pts), len(lower_pts))
print("upper end", upper_pts[-5:])
print("lower end", lower_pts[-5:])
print("tip gap", upper_pts[-1][1] - lower_pts[-1][1] if upper_pts and lower_pts else None)

# After crossing, "upper" track may swap — detect by y order
# Re-label by geometric top/bottom at each x using interpolation


def interp_series(pts, xs):
    if len(pts) < 2:
        return {}
    px = np.array([p[0] for p in pts], float)
    py = np.array([p[1] for p in pts], float)
    # unique x
    uniq = {}
    for x, y in pts:
        uniq[x] = y
    xs_u = np.array(sorted(uniq))
    ys_u = np.array([uniq[x] for x in xs_u])
    out = {}
    for x in xs:
        if x < xs_u[0] or x > xs_u[-1]:
            continue
        out[x] = float(np.interp(x, xs_u, ys_u))
    return out


common_xs = sorted(set(x for x, _ in upper_pts) & set(x for x, _ in lower_pts))
# At each x, y_a = currently tracked upper, y_b = lower — but after cross they swap identity
# For SVG we want TWO continuous ribbons: ribbon that STARTS on top, ribbon that STARTS on bottom

# Continuity-based (already have upper_pts/lower_pts as continuous tracks from start)
# Check if they cross (order swap)


def thin(pts, step=6):
    if not pts:
        return []
    out = [pts[0]]
    for p in pts[1:]:
        if p[0] - out[-1][0] >= step:
            out.append(p)
    if out[-1] != pts[-1]:
        out.append(pts[-1])
    return out


def smooth(pts, k=5):
    if len(pts) < k:
        return pts
    ys = np.array([p[1] for p in pts])
    kernel = np.ones(k) / k
    pad = k // 2
    yp = np.pad(ys, (pad, pad), mode="edge")
    sm = np.convolve(yp, kernel, mode="valid")
    # keep ends exact
    sm[0], sm[-1] = ys[0], ys[-1]
    return [(pts[i][0], float(sm[i])) for i in range(len(pts))]


u = smooth(thin(upper_pts, 5), 7)
l = smooth(thin(lower_pts, 5), 7)

# Find crossings: where u-l changes sign of (u-l) wait u starts above so u.y < l.y
crosses = []
for i in range(1, min(len(u), len(l))):
    # align by nearest x
    pass

# print keypoints
print("\nUPPER keypoints")
for p in u[::2]:
    print(f"  {p[0]:.0f},{p[1]:.1f}")
print("\nLOWER keypoints")
for p in l[::2]:
    print(f"  {p[0]:.0f},{p[1]:.1f}")

# Draw debug
dbg = img.convert("RGB")
d = ImageDraw.Draw(dbg)
for x, y in upper_pts:
    d.point((x, int(y)), fill=(220, 30, 30))
for x, y in lower_pts:
    d.point((x, int(y)), fill=(30, 90, 220))
# mark ends with circles
if u:
    d.ellipse((u[-1][0] - 4, u[-1][1] - 4, u[-1][0] + 4, u[-1][1] + 4), outline=(255, 0, 0), width=2)
if l:
    d.ellipse((l[-1][0] - 4, l[-1][1] - 4, l[-1][0] + 4, l[-1][1] + 4), outline=(0, 80, 255), width=2)
dbg.save(OUT / "_trace_debug.png")

# Also save a crop of right half overlay
right = dbg.crop((cx - 20, cy - 100, w, cy + 100))
right.save(OUT / "_trace_right.png")
print("saved debug images")


def catmull(pts):
    if len(pts) < 2:
        return ""
    # downsample to ~12
    idx = np.linspace(0, len(pts) - 1, min(14, len(pts))).astype(int)
    pts = [pts[i] for i in idx]
    d = [f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"]
    ext = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(
            f"C{c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {p2[0]:.1f} {p2[1]:.1f}"
        )
    return " ".join(d), pts


path_u, ku = catmull(u)
path_l, kl = catmull(l)
print("\nPATH_A (starts upper)\n", path_u)
print("\nPATH_B (starts lower)\n", path_l)
print("end A", ku[-1], "end B", kl[-1], "gap", ku[-1][1] - kl[-1][1])
