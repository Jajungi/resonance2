"""Build smooth cubic SVG paths for two phase-offset sine waves."""
import math

cx, cy = 320.0, 220.0
x0, x1 = 188.0, 452.0
amp = 86.0
# one full period; phases 0 and π
# sample control with cubic segments of equal t-width


def sine_y(t, phase):
    return cy + amp * math.sin(2 * math.pi * t + phase)


def sine_x(t):
    return x0 + (x1 - x0) * t


def cubic_sine(phase, segs=8):
    # For y=sin(2πt), derivative y'=2π amp cos(2πt+phase)
    # dx/dt = (x1-x0), dy/dt = 2π amp cos(...)
    span = x1 - x0
    d = ""
    for i in range(segs):
        t0 = i / segs
        t1 = (i + 1) / segs
        x_a, y_a = sine_x(t0), sine_y(t0, phase)
        x_b, y_b = sine_x(t1), sine_y(t1, phase)
        dt = t1 - t0
        # unit tangent scaled by dt/3 in t-domain
        c0 = math.cos(2 * math.pi * t0 + phase)
        c1 = math.cos(2 * math.pi * t1 + phase)
        dx0 = span * dt / 3
        dy0 = (2 * math.pi * amp * c0) * dt / 3
        dx1 = span * dt / 3
        dy1 = (2 * math.pi * amp * c1) * dt / 3
        if i == 0:
            d = f"M{x_a:.1f} {y_a:.1f}"
        d += f" C{x_a+dx0:.1f} {y_a+dy0:.1f}, {x_b-dx1:.1f} {y_b-dy1:.1f}, {x_b:.1f} {y_b:.1f}"
    return d


print(cubic_sine(0))
print(cubic_sine(math.pi))
