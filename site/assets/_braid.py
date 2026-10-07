"""Uneven overlapping sines: larger lobe near core, cross, smaller lobe to tip."""
import math

cx, cy = 320.0, 220.0
core_r = 22.0
tip = 132.0  # distance from center to tip
# cross closer to tip → inner lobe larger
cross_t = 0.58
amp_inner = 88.0
amp_outer = 38.0


def lobe_amp(t):
    """Amplitude peaks in inner lobe, smaller after cross."""
    if t <= cross_t:
        u = t / cross_t
        return amp_inner * math.sin(math.pi * u)
    u = (t - cross_t) / (1 - cross_t)
    return -amp_outer * math.sin(math.pi * u)  # opposite side after cross


def path_side(sign_x, phase_sign):
    """phase_sign +1 starts upward, -1 starts downward."""
    pts = []
    n = 40
    for i in range(n + 1):
        t = i / n
        x = cx + sign_x * (core_r + (tip - core_r) * t)
        y = cy + phase_sign * lobe_amp(t)
        pts.append((x, y))
    # cubic-ish via polyline dense enough; convert to smooth C with catmull-ish
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(1, len(pts)):
        d += f" L{pts[i][0]:.1f} {pts[i][1]:.1f}"
    return d


def to_cubic(pts):
    if len(pts) < 2:
        return ""
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


def side_pts(sign_x, phase_sign):
    pts = []
    n = 32
    for i in range(n + 1):
        t = i / n
        x = cx + sign_x * (core_r + (tip - core_r) * t)
        y = cy + phase_sign * lobe_amp(t)
        pts.append((x, y))
    return pts


print("RA", to_cubic(side_pts(1, +1)))
print("RB", to_cubic(side_pts(1, -1)))
print("LA", to_cubic(side_pts(-1, +1)))
print("LB", to_cubic(side_pts(-1, -1)))
