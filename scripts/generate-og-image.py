#!/usr/bin/env python3
"""Draw the Open Graph share card.

Why this exists as a committed script rather than a one-off export: the PNG in
`public/og.png` is the product's entire appearance on Hacker News, Reddit, X,
LinkedIn, Slack, Discord and WhatsApp, and a card nobody can regenerate is a
card nobody will ever update. Run it, commit the PNG it writes.

    python3 scripts/generate-og-image.py

No new project dependency: this runs on Pillow at author time and produces a
static file. Nothing here ships to the browser.

The colours are the app's own dark tokens, read from `app/globals.css` rather
than copied, so the card cannot drift from the site it represents.
"""

from __future__ import annotations

import io
import os
import re
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # pragma: no cover - author-time tool
    sys.exit("Pillow is required: python3 -m pip install Pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIDTH, HEIGHT = 1200, 630
MARGIN = 84


def dark_tokens() -> dict[str, str]:
    """The dark-theme values from globals.css, so the card matches the site."""
    css = io.open(os.path.join(ROOT, "app", "globals.css"), encoding="utf8").read()
    wanted = ("background", "foreground", "success", "muted-foreground", "border")
    found: dict[str, str] = {}
    # The dark values are the *second* definition of each token in the file.
    for name in wanted:
        hits = re.findall(rf"--{name}:\s*(#[0-9a-fA-F]{{3,8}})\s*;", css)
        if not hits:
            sys.exit(f"token --{name} not found in app/globals.css")
        found[name] = hits[-1]
    return found


def font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


SANS_BOLD = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
SANS = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
MONO = [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Supplemental/Courier New Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
]


def wrap(draw: ImageDraw.ImageDraw, text: str, f, max_width: int) -> list[str]:
    words, lines, line = text.split(), [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=f) <= max_width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def main() -> None:
    t = dark_tokens()
    image = Image.new("RGB", (WIDTH, HEIGHT), t["background"])
    draw = ImageDraw.Draw(image)

    # A single accent rule down the left edge. One brand gesture, not five.
    draw.rectangle([0, 0, 10, HEIGHT], fill=t["success"])

    headline_font = font(SANS_BOLD, 76)
    sub_font = font(SANS, 31)
    label_font = font(SANS_BOLD, 22)
    mono_font = font(MONO, 25)

    x = MARGIN
    y = MARGIN - 8

    # Wordmark, quiet, so the claim below it is what carries the card.
    draw.text((x, y), "getopentools.com", font=label_font, fill=t["muted-foreground"])
    y += 62

    # The whole product in one sentence. This is what a thumbnail has to land.
    headline = "Your files never leave your browser."
    lines = wrap(draw, headline, headline_font, WIDTH - MARGIN * 2)
    for line in lines:
        draw.text((x, y), line, font=headline_font, fill=t["foreground"])
        y += 88
    y += 18

    sub = "Free PDF, image and text tools that run on your own device. No upload, no signup, no ads."
    for line in wrap(draw, sub, sub_font, WIDTH - MARGIN * 2 - 40):
        draw.text((x, y), line, font=sub_font, fill=t["muted-foreground"])
        y += 44

    # The proof, not an adjective. This is the line that earns a sceptic's click:
    # it names a policy they can verify in devtools in ten seconds.
    chip_y = HEIGHT - MARGIN - 54
    chip_text = "connect-src 'none'"
    chip_w = draw.textlength(chip_text, font=mono_font) + 40
    draw.rounded_rectangle(
        [x, chip_y, x + chip_w, chip_y + 54], radius=10, fill=t["border"]
    )
    draw.text((x + 20, chip_y + 13), chip_text, font=mono_font, fill=t["success"])
    draw.text(
        (x + chip_w + 20, chip_y + 15),
        "— your browser blocks this page from uploading",
        font=sub_font,
        fill=t["muted-foreground"],
    )

    out = os.path.join(ROOT, "public", "og.png")
    image.save(out, "PNG", optimize=True)
    print(f"wrote {out}  {WIDTH}x{HEIGHT}  {os.path.getsize(out):,} bytes")


if __name__ == "__main__":
    main()
