import math

cx, cy = 320, 220


def arc(r, a0, a1):
    def pt(deg):
        rad = math.radians(deg)
        return cx + r * math.cos(rad), cy - r * math.sin(rad)

    x0, y0 = pt(a0)
    x1, y1 = pt(a1)
    large = 1 if abs(a1 - a0) > 180 else 0
    sweep = 1 if a1 > a0 else 0
    return f"M{x0:.1f} {y0:.1f} A{r} {r} 0 {large} {sweep} {x1:.1f} {y1:.1f}"


quads = [(20, 70), (110, 160), (200, 250), (290, 340)]
for r in (63, 102):
    print("r", r)
    for a0, a1 in quads:
        print(arc(r, a0, a1))
