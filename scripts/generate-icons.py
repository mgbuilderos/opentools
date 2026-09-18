#!/usr/bin/env python3
"""Draw the OpenTools mark and every icon size the site needs.

A classical O: a circle with horizontal stress, so the sides carry more weight
than the top and bottom, the way a drawn letter does rather than a drafted
ring. Black on white, no colour — the mark should not depend on a palette that
may change, and it has to survive being 16 pixels wide in a browser tab.

The proportions below are the whole design. The inner ellipse is narrower than
it is tall, which is what produces the stress; making it a circle instead gives
a uniform ring that reads as a symbol rather than a letter.

    python3 scripts/generate-icons.py
"""

import io
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
WHITE = "#ffffff"
BLACK = "#0a0a0a"

# Fractions of the canvas, so every size is the same drawing.
OUTER = 0.332   # outer radius
INNER_X = 0.250  # inner half-width  -> side stroke  = .082
INNER_Y = 0.281  # inner half-height -> top stroke   = .051


def draw(size: int, background: str = WHITE) -> Image.Image:
    image = Image.new("RGB", (size, size), background)
    pen = ImageDraw.Draw(image)
    c = size / 2
    r = size * OUTER
    pen.ellipse([c - r, c - r, c + r, c + r], fill=BLACK)
    rx, ry = size * INNER_X, size * INNER_Y
    pen.ellipse([c - rx, c - ry, c + rx, c + ry], fill=background)
    return image


def supersampled(size: int) -> Image.Image:
    """Draw at 8x and shrink — PIL has no anti-aliasing on shapes."""
    return draw(size * 8).resize((size, size), Image.LANCZOS)


SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="{WHITE}"/>
  <circle cx="256" cy="256" r="{512 * OUTER:.1f}" fill="{BLACK}"/>
  <ellipse cx="256" cy="256" rx="{512 * INNER_X:.1f}" ry="{512 * INNER_Y:.1f}" fill="{WHITE}"/>
</svg>
"""


def main() -> None:
    written = []

    with io.open(os.path.join(PUBLIC, "favicon.svg"), "w", encoding="utf8") as f:
        f.write(SVG)
    written.append("favicon.svg")

    for name, size in [
        ("icon-32.png", 32),
        ("icon-192.png", 192),
        ("icon-512.png", 512),
        # iOS composites its own rounded corners, so this stays square and opaque.
        ("apple-touch-icon.png", 180),
    ]:
        supersampled(size).save(os.path.join(PUBLIC, name), "PNG", optimize=True)
        written.append(name)

    # Multi-resolution .ico for browsers and Windows that still ask for one.
    supersampled(64).save(
        os.path.join(PUBLIC, "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )
    written.append("favicon.ico")

    for name in written:
        path = os.path.join(PUBLIC, name)
        print(f"  {name:<24}{os.path.getsize(path):>8,} bytes")


if __name__ == "__main__":
    main()
