"""
Build right-side waves from red-trace samples (hand-cleaned),
mirror left, write SVG snippet paths.
Upper = tall asymmetric hill; lower = shallow valley; meet at tip.
"""
import json

# Keypoints from red-trace sampling (image space), cleaned by eye against user sketch.
# Then mapped into mark viewBox 640×440, center (320,220).
# Image red: x 546→817, upper peak ~681/178, lower valley ~700/388, tip ~817/205

img_x0, img_x1 = 546.0, 817.0
img_ymid = 275.0
img_yspan = 212.0  # ~178..390


def map_pt(ix, iy, cx=320.0, cy=220.0, core=22.0, tip=152.0):
    t = (ix - img_x0) / (img_x1 - img_x0)
    x = cx + core + (tip - core) * t
    y = cy + (iy - img_ymid) / img_yspan * 148.0
    return (round(x, 1), round(y, 1))


# Upper red: start mid → steep rise → high peak (left of mid-wing) → long soft fall → tip
upper_img = [
    (546, 258),
    (565, 248),
    (585, 225),
    (610, 195),
    (640, 178),
    (670, 174),
    (700, 180),
    (735, 192),
    (765, 204),
    (790, 212),
    (810, 218),
    (817, 220),
]

# Lower red: start mid → drop to shallow long valley → slight rise → tip
lower_img = [
    (546, 258),
    (565, 305),
    (590, 350),
    (620, 368),
    (655, 372),
    (690, 378),
    (725, 385),
    (755, 370),
    (780, 320),
    (800, 260),
    (812, 230),
    (817, 220),
]

ru = [map_pt(x, y) for x, y in upper_img]
rl = [map_pt(x, y) for x, y in lower_img]
# pin tip & ease start off midline slightly after first point
ru[0] = (342.0, 216.0)
rl[0] = (342.0, 224.0)
ru[-1] = (472.0, 220.0)
rl[-1] = (472.0, 220.0)


def catmull(pts):
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1 = pts[i]
        p2 = pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else pts[i + 1]
        c1x = p1[0] + (p2[0] - p0[0]) / 6
        c1y = p1[1] + (p2[1] - p0[1]) / 6
        c2x = p2[0] - (p3[0] - p1[0]) / 6
        c2y = p2[1] - (p3[1] - p1[1]) / 6
        d += f" C{c1x:.1f} {c1y:.1f}, {c2x:.1f} {c2y:.1f}, {p2[0]:.1f} {p2[1]:.1f}"
    return d


def mirror(pts):
    return [(640.0 - x, y) for x, y in pts]


paths = {
    "right_a": catmull(ru),  # upper hill
    "right_b": catmull(rl),  # lower valley
    "left_a": catmull(mirror(ru)),
    "left_b": catmull(mirror(rl)),
}
print(json.dumps(paths, indent=2))
open(r"C:\Users\정명진\Documents\Project\인종_new\site\assets\wave-paths.json", "w", encoding="utf-8").write(
    json.dumps(paths, indent=2)
)
