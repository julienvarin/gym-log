#!/usr/bin/env python3
"""Generate app icons (pure stdlib, no external deps).

Draws a full-bleed gradient square with a white dumbbell, supersampled for
smooth anti-aliased edges. Full-bleed (no transparent corners) so iOS's
home-screen mask and PWA "maskable" masking both round it correctly.
"""
import math
import struct
import zlib
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")

# Gradient endpoints (top -> bottom): indigo -> violet
TOP = (124, 108, 246)    # #7c6cf6
BOT = (139, 92, 246)     # #8b5cf6
FG = (255, 255, 255)     # glyph


def lerp(a, b, t):
    return a + (b - a) * t


def sample(x, y, n):
    """Return (r,g,b) for the pixel at fractional coords in a unit square [0,1]."""
    bg = tuple(lerp(TOP[i], BOT[i], y) for i in range(3))
    aa = 1.0 / n  # one pixel, for a soft edge

    def rect(x0, y0, x1, y1, r):
        # signed distance to a rounded rectangle, as coverage
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        hx, hy = (x1 - x0) / 2 - r, (y1 - y0) / 2 - r
        qx, qy = abs(x - cx) - hx, abs(y - cy) - hy
        d = math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r
        return clamp01(-d / aa + 0.5)

    # dumbbell: a bar, two big plates, two small outer plates
    cov = max(
        rect(0.30, 0.47, 0.70, 0.53, 0.02),   # bar
        rect(0.27, 0.30, 0.35, 0.70, 0.035),  # inner plates
        rect(0.65, 0.30, 0.73, 0.70, 0.035),
        rect(0.19, 0.38, 0.26, 0.62, 0.03),   # outer plates
        rect(0.74, 0.38, 0.81, 0.62, 0.03),
    )
    return tuple(int(lerp(bg[i], FG[i], cov) + 0.5) for i in range(3))


def clamp01(v):
    return 0.0 if v < 0 else (1.0 if v > 1 else v)


def render(size, ss=4):
    """Render an RGBA icon of given size, supersampled by ss for AA."""
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            ar = ag = ab = 0
            for sy in range(ss):
                for sx in range(ss):
                    ux = (px + (sx + 0.5) / ss) / size
                    uy = (py + (sy + 0.5) / ss) / size
                    r, g, b = sample(ux, uy, size)
                    ar += r
                    ag += g
                    ab += b
            k = ss * ss
            row += bytes((ar // k, ag // k, ab // k, 255))
        rows.append(bytes(row))
    return rows


def write_png(path, size, ss=4):
    rows = render(size, ss)
    raw = bytearray()
    for r in rows:
        raw.append(0)  # filter type 0 (none)
        raw += r
    comp = zlib.compress(bytes(raw), 9)

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        c += struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        return c

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", comp) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path, size, "px")


if __name__ == "__main__":
    write_png(os.path.join(OUT, "icon-1024.png"), 1024)
    write_png(os.path.join(OUT, "icon-512.png"), 512)
    write_png(os.path.join(OUT, "icon-192.png"), 192)
    write_png(os.path.join(OUT, "apple-touch-icon.png"), 180)
    write_png(os.path.join(OUT, "favicon-32.png"), 32)
