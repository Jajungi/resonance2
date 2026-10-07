"""Two sines, same phase, different amplitude — not top/bottom mirror."""
import math

cx, cy = 320.0, 220.0
x0, x1 = 188.0, 452.0
amp_a, amp_b = 82.0, 48.0


def to_cubic(amp):
    pts = []
    n = 36
    for i in range(n + 1):
        t = i / n
        x = x0 + (x1 - x0) * t
        y = cy + amp * math.sin(2 * math.pi * t)
        pts.append((x, y))
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


print(to_cubic(amp_a))
print(to_cubic(amp_b))
