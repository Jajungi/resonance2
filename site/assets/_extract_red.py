from PIL import Image
import numpy as np

img = Image.open(
    r"C:\Users\정명진\.cursor\projects\c-Users-Documents-Project-new\assets"
    r"\c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_"
    r"64739904f36768e944f577681847d915_images_image-9f66f01e-8236-4d19-94c0-a7b908cf5365.png"
)
arr = np.array(img.convert("RGBA"))
r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
red = (r > 160) & (g < 120) & (b < 120)

xs = {}
for y, x in zip(*np.where(red)):
    xs.setdefault(int(x), []).append(int(y))

upper, lower = [], []
prev_u, prev_l = None, None
for x in sorted(xs):
    ys = sorted(xs[x])
    if len(ys) == 1:
        y = ys[0]
        if prev_u is None:
            upper.append((x, y))
            prev_u = y
        elif prev_l is None or abs(y - prev_u) <= abs(y - prev_l):
            upper.append((x, y))
            prev_u = y
        else:
            lower.append((x, y))
            prev_l = y
        continue
    gaps = [(ys[i + 1] - ys[i], i) for i in range(len(ys) - 1)]
    if gaps and max(gaps)[0] > 8:
        i = max(gaps)[1]
        yu = int(np.mean(ys[: i + 1]))
        yl = int(np.mean(ys[i + 1 :]))
    else:
        yu, yl = ys[0], ys[-1]
    upper.append((x, yu))
    lower.append((x, yl))
    prev_u, prev_l = yu, yl


def resample(pts, step=8):
    pts = sorted(pts)
    out = [pts[0]]
    for p in pts[1:]:
        if p[0] - out[-1][0] >= step:
            out.append(p)
    if out[-1] != pts[-1]:
        out.append(pts[-1])
    return out


u = resample(upper, 8)
l = resample(lower, 8)
print("UPPER n", len(u))
for p in u:
    print(p)
print("LOWER n", len(l))
for p in l:
    print(p)

tip_x = max(u[-1][0], l[-1][0])
tip_ys = [y for x, y in u + l if x > tip_x - 15]
tip_y = int(np.mean(tip_ys))
print("tip", tip_x, tip_y)

x0, x1 = min(p[0] for p in u + l), max(p[0] for p in u + l)


def map_pts(pts):
    out = []
    for x, y in pts:
        nx = 342 + (x - x0) / (x1 - x0) * 130
        ny = 220 + (y - tip_y) * 0.85
        out.append((round(nx, 1), round(ny, 1)))
    return out


mu, ml = map_pts(u), map_pts(l)
print("MAPPED UPPER")
for p in mu:
    print(p)
print("MAPPED LOWER")
for p in ml:
    print(p)

# Also sample original mark gold waves on right side
sym = Image.open(r"c:\Users\정명진\Documents\Project\인종_new\site\assets\wonum-symbol.png")
print("symbol", sym.size)
sa = np.array(sym.convert("RGBA"))
# dark ink on light? or bronze on white
sr, sg, sb, sa_a = sa[:, :, 0], sa[:, :, 1], sa[:, :, 2], sa[:, :, 3]
ink = (sa_a > 40) & (sr + sg + sb < 520) & (sr > 80)
# focus right of center
h, w = ink.shape
cx = w // 2
right = ink.copy()
right[:, : cx + int(w * 0.04)] = False
# for each x find two y bands near horizontal mid
cy = h // 2
print("ink right", right.sum())
