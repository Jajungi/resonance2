"""Extract the two red hand-traced wave paths from the user's reference image."""
from PIL import Image, ImageDraw
import numpy as np

SRC = r"C:\Users\정명진\.cursor\projects\c-Users-Documents-Project-new\assets\c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_64739904f36768e944f577681847d915_images_image-9f66f01e-8236-4d19-94c0-a7b908cf5365.png"
OUT_DBG = r"C:\Users\정명진\Documents\Project\인종_new\site\assets\red-trace-debug.png"

im = Image.open(SRC).convert("RGBA")
arr = np.array(im)
H, W = arr.shape[:2]
print("size", W, H)

r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
# red strokes: high R, low G/B
red = (r > 160) & (g < 120) & (b < 120) & (a > 40)
# focus right half where traces are
red[:, : W // 2] = False

ys, xs = np.where(red)
print("red count", len(xs), "bbox", xs.min(), ys.min(), xs.max(), ys.max())

# For each x, collect y's of red, split into clusters → up to 2 strokes
cols = {}
for x, y in zip(xs, ys):
    cols.setdefault(int(x), []).append(int(y))

series = []  # (x, y_upper, y_lower) or one
for x in sorted(cols):
    ys_x = sorted(cols[x])
    # cluster
    clusters = []
    s = p = ys_x[0]
    for y in ys_x[1:]:
        if y <= p + 3:
            p = y
        else:
            clusters.append((s + p) / 2)
            s = p = y
    clusters.append((s + p) / 2)
    if len(clusters) >= 2:
        series.append((x, clusters[0], clusters[-1]))
    elif len(clusters) == 1:
        series.append((x, clusters[0], clusters[0]))

print("series len", len(series), "x range", series[0][0], series[-1][0])

# split into two tracks with continuity
t1, t2 = [], []
for i, (x, yu, yl) in enumerate(series):
    if i == 0:
        t1.append((x, yu))
        t2.append((x, yl))
    else:
        # assign by nearest previous
        cands = [yu, yl]
        for track in (t1, t2):
            ly = track[-1][1]
            best = min(cands, key=lambda yy: abs(yy - ly))
            track.append((x, best))
            cands.remove(best) if best in cands else None
            if not cands:
                break
        # if only one unique y
        if len(set([yu, yl])) == 1 and len(t1) == len(t2):
            pass

# ensure t1 is the "upper" (smaller y) on average
if np.mean([y for _, y in t1]) > np.mean([y for _, y in t2]):
    t1, t2 = t2, t1

print("track1 sample", t1[:: max(1, len(t1)//10)])
print("track2 sample", t2[:: max(1, len(t2)//10)])


def simplify(pts, n=24):
    if len(pts) <= n:
        return pts
    idx = np.linspace(0, len(pts) - 1, n).astype(int)
    return [pts[i] for i in idx]


def to_cubic(pts):
    pts = simplify(pts, 20)
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1 = pts[i]
        p2 = pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {p2[0]:.1f} {p2[1]:.1f}"
    return d, pts


d1, p1 = to_cubic(t1)
d2, p2 = to_cubic(t2)
print("PATH_UPPER")
print(d1)
print("PATH_LOWER")
print(d2)

# normalize to mark viewBox: map red-trace x,y into mark space
# Red traces sit on right half of image. Map tip and start to mark coords.
# We'll remap: leftmost red x -> core edge, rightmost -> tip
x0, x1 = t1[0][0], t1[-1][0]
y_mid = (np.mean([y for _, y in t1]) + np.mean([y for _, y in t2])) / 2
print("x0,x1,y_mid", x0, x1, y_mid)


def remap(pts, cx=320, cy=220, core_r=22, tip=148):
    out = []
    for x, y in pts:
        t = (x - x0) / max(1, (x1 - x0))
        nx = cx + core_r + (tip - core_r) * t
        ny = cy + (y - y_mid) * 0.95  # scale vertical relative to mid
        out.append((nx, ny))
    return out


# better vertical scale: use span of red ys
ys_all = [y for _, y in t1] + [y for _, y in t2]
yspan = max(ys_all) - min(ys_all)
target_span = 150  # in mark units


def remap2(pts, cx=320, cy=220, core_r=22, tip=150):
    out = []
    for x, y in pts:
        t = (x - x0) / max(1e-6, (x1 - x0))
        nx = cx + core_r + (tip - core_r) * t
        ny = cy + (y - y_mid) / yspan * target_span
        out.append((nx, ny))
    return out


def cubic_from(pts):
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1 = pts[i]
        p2 = pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {p2[0]:.1f} {p2[1]:.1f}"
    return d


ru = remap2(simplify(t1, 22))
rl = remap2(simplify(t2, 22))
# force tip meet
tip_x = 320 + 150
ru[-1] = (tip_x, 220.0)
rl[-1] = (tip_x, 220.0)
# force start near core rim, slightly offset
ru[0] = (342.0, ru[0][1])
rl[0] = (342.0, rl[0][1])

print("MARK_RIGHT_UPPER")
print(cubic_from(ru))
print("MARK_RIGHT_LOWER")
print(cubic_from(rl))

# mirror left
def mirror(pts):
    return [(640 - x, y) for x, y in pts]

lu, ll = mirror(ru), mirror(rl)
print("MARK_LEFT_UPPER")
print(cubic_from(lu))
print("MARK_LEFT_LOWER")
print(cubic_from(ll))

# debug draw on white
dbg = Image.new("RGB", (W, H), (255, 255, 255))
draw = ImageDraw.Draw(dbg)
for x, y in t1:
    draw.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(220, 30, 30))
for x, y in t2:
    draw.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(30, 80, 200))
dbg.save(OUT_DBG)
print("saved", OUT_DBG)

# write paths json for HTML build
import json
open(r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wave-paths.json", "w", encoding="utf-8").write(
    json.dumps(
        {
            "right_upper": cubic_from(ru),
            "right_lower": cubic_from(rl),
            "left_upper": cubic_from(lu),
            "left_lower": cubic_from(ll),
            "ru_pts": ru,
            "rl_pts": rl,
        },
        ensure_ascii=False,
        indent=2,
    )
)
