"""Extract right-side wave skeletons from wonum-symbol.png and red traces."""
from PIL import Image, ImageDraw
import numpy as np
from pathlib import Path

OUT = Path(r"c:\Users\정명진\Documents\Project\인종_new\site\assets")

# --- original symbol ---
sym = Image.open(OUT / "wonum-symbol.png").convert("RGBA")
sa = np.array(sym)
r, g, b, a = sa[:, :, 0], sa[:, :, 1], sa[:, :, 2], sa[:, :, 3]
# bronze ink on white-ish
ink = (a > 30) & ((r.astype(int) + g + b) < 600) & (r > 70) & (r >= g - 20)
h, w = ink.shape
cx, cy = w // 2, h // 2
# mask out core disk
yy, xx = np.ogrid[:h, :w]
core = (xx - cx) ** 2 + (yy - cy) ** 2 < (min(w, h) * 0.055) ** 2
# keep right half waves only: x > cx+core, |y-cy| band
right = ink & ~core & (xx > cx + 8) & (xx < w - 4)
# remove rings roughly: rings are more circular - keep only mid horizontal band
band = np.abs(yy - cy) < h * 0.28
right &= band

# for each x, find upper and lower y clusters
cols = {}
for y, x in zip(*np.where(right)):
    cols.setdefault(int(x), []).append(int(y))

upper, lower = [], []
for x in sorted(cols):
    ys = sorted(cols[x])
    # discard if too many (ring fragments)
    if len(ys) > 40:
        continue
    gaps = [(ys[i + 1] - ys[i], i) for i in range(len(ys) - 1)]
    if gaps and max(gaps)[0] >= 6:
        i = max(gaps)[1]
        top = ys[: i + 1]
        bot = ys[i + 1 :]
        if top and bot:
            upper.append((x, int(np.median(top))))
            lower.append((x, int(np.median(bot))))
    elif ys:
        # single cluster - assign by side of cy
        m = int(np.median(ys))
        if m < cy:
            upper.append((x, m))
        else:
            lower.append((x, m))


def resample(pts, step=4):
    if not pts:
        return []
    pts = sorted(pts)
    out = [pts[0]]
    for p in pts[1:]:
        if p[0] - out[-1][0] >= step:
            out.append(p)
    if out[-1] != pts[-1]:
        out.append(pts[-1])
    return out


u = resample(upper, 5)
l = resample(lower, 5)
print("MARK UPPER", len(u), "y", min(p[1] for p in u), max(p[1] for p in u))
print("MARK LOWER", len(l), "y", min(p[1] for p in l), max(p[1] for p in l))
for p in u[::2]:
    print("U", p)
print("---")
for p in l[::2]:
    print("L", p)

dbg = sym.convert("RGB")
d = ImageDraw.Draw(dbg)
for x, y in u:
    d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(220, 30, 30))
for x, y in l:
    d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(30, 80, 220))
dbg.save(OUT / "_mark_wave_debug.png")
print("saved _mark_wave_debug.png")

# --- red traces with tip fix ---
trace = Image.open(
    r"C:\Users\정명진\.cursor\projects\c-Users-Documents-Project-new\assets"
    r"\c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_"
    r"64739904f36768e944f577681847d915_images_image-9f66f01e-8236-4d19-94c0-a7b908cf5365.png"
).convert("RGBA")
ta = np.array(trace)
tr, tg, tb = ta[:, :, 0], ta[:, :, 1], ta[:, :, 2]
red = (tr > 160) & (tg < 120) & (tb < 120)
xs = {}
for y, x in zip(*np.where(red)):
    xs.setdefault(int(x), []).append(int(y))

ru, rl = [], []
for x in sorted(xs):
    ys = sorted(xs[x])
    gaps = [(ys[i + 1] - ys[i], i) for i in range(len(ys) - 1)]
    if gaps and max(gaps)[0] > 10:
        i = max(gaps)[1]
        ru.append((x, int(np.median(ys[: i + 1]))))
        rl.append((x, int(np.median(ys[i + 1 :]))))
    elif len(ys) >= 2:
        ru.append((x, ys[0]))
        rl.append((x, ys[-1]))

ru, rl = resample(ru, 6), resample(rl, 6)
# drop lower points that jump up near tip (merged)
clean_l = []
for i, (x, y) in enumerate(rl):
    if clean_l and y < clean_l[-1][1] - 80:
        break
    clean_l.append((x, y))
# extend lower to tip by easing to upper tip
tip = ru[-1]
if clean_l[-1][0] < tip[0]:
    x0, y0 = clean_l[-1]
    x1, y1 = tip
    for t in np.linspace(0.15, 1.0, 8):
        clean_l.append((int(x0 + (x1 - x0) * t), int(y0 + (y1 - y0) * (t**1.35))))

print("\nRED UPPER peak", min(p[1] for p in ru), "start", ru[0], "end", ru[-1])
print("RED LOWER valley", max(p[1] for p in clean_l), "start", clean_l[0], "end", clean_l[-1])

# map red shape onto mark scale using mark's start/end
# mark waves start ~ cx+core_r, end at tip
if u and l:
    mx0 = min(u[0][0], l[0][0])
    mx1 = max(u[-1][0], l[-1][0])
    my_tip = (u[-1][1] + l[-1][1]) / 2
    # amplitude scale from red to mark
    red_amp_u = tip[1] - min(p[1] for p in ru)
    mark_amp_u = my_tip - min(p[1] for p in u)
    red_amp_l = max(p[1] for p in clean_l) - tip[1]
    mark_amp_l = max(p[1] for p in l) - my_tip
    print("amps red", red_amp_u, red_amp_l, "mark", mark_amp_u, mark_amp_l)

    rx0, rx1 = ru[0][0], tip[0]
    ry_tip = tip[1]

    def map_red(pts, amp_src, amp_dst, sign):
        out = []
        for x, y in pts:
            nx = mx0 + (x - rx0) / (rx1 - rx0) * (mx1 - mx0)
            # normalize deviation from tip line
            dy = (y - ry_tip) / amp_src * amp_dst if amp_src else 0
            ny = my_tip + dy
            out.append((round(nx, 1), round(ny, 1)))
        return out

    mu = map_red(ru, red_amp_u, mark_amp_u, -1)
    ml = map_red(clean_l, red_amp_l, mark_amp_l, 1)
    print("MAPPED TO MARK UPPER")
    for p in mu[::2]:
        print(p)
    print("MAPPED TO MARK LOWER")
    for p in ml[::2]:
        print(p)

    # draw on mark
    dbg2 = sym.convert("RGB")
    d2 = ImageDraw.Draw(dbg2)
    for x, y in mu:
        d2.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(220, 30, 30))
    for x, y in ml:
        d2.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(30, 80, 220))
    dbg2.save(OUT / "_red_on_mark.png")
    print("saved _red_on_mark.png")

    # build cubic path via catmull
    def catmull_to_bezier(pts):
        if len(pts) < 2:
            return ""
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

    # thin keypoints
    def thin(pts, n=10):
        if len(pts) <= n:
            return pts
        idx = np.linspace(0, len(pts) - 1, n).astype(int)
        return [pts[i] for i in idx]

    path_u = catmull_to_bezier(thin(mu, 12))
    path_l = catmull_to_bezier(thin(ml, 12))
    print("\nPATH_U\n", path_u)
    print("\nPATH_L\n", path_l)
