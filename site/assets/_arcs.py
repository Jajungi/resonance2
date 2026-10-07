import math

cx, cy = 320, 220


def pt(r, deg):
    rad = math.radians(deg)
    return cx + r * math.cos(rad), cy - r * math.sin(rad)


def arc(r, a0, a1):
    x0, y0 = pt(r, a0)
    x1, y1 = pt(r, a1)
    # sweep=0 goes clockwise in SVG when y grows down... 
    # from a0 to a1 decreasing angle = clockwise in standard math with y-up
    # We want CCW along the circle for NE from 20 to 70 (increasing angle = CCW in math = counterclockwise visually with y-up)
    # In SVG: sweep-flag 1 = positive angle (CW in screen coords? Actually SVG: sweep 1 = clockwise)
    # Math angle increasing with y-up is CCW. With y-down screen, that maps to CW in SVG.
    # So increasing math angle => SVG sweep=1
    large = 1 if abs(a1 - a0) > 180 else 0
    sweep = 1 if a1 > a0 else 0
    return f'M{x0:.1f} {y0:.1f} A{r} {r} 0 {large} {sweep} {x1:.1f} {y1:.1f}'


# gaps ~18° around N/E/S/W axes
# NE: 18..72, NW: 108..162, SW: 198..252, SE: 288..342
quads = [(18, 72), (108, 162), (198, 252), (288, 342)]
for r in (52, 84, 118):
    print(f"r={r}")
    for a0, a1 in quads:
        print(" ", arc(r, a0, a1))
