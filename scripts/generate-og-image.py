#!/usr/bin/env python3
"""Draw the Open Graph share cards.

Why this exists as a committed script rather than a one-off export: the PNG in
`public/og.png` is the product's entire appearance on Hacker News, Reddit, X,
LinkedIn, Slack, Discord and WhatsApp, and a card nobody can regenerate is a
card nobody will ever update. Run it, commit the PNGs it writes.

    python3 scripts/generate-og-image.py

It writes one card per section, not one card for the whole site. A 360 sweep on
2026-09-23 found 78 URLs shipping no `og:image` at all -- `/guides`, `/blog`,
every `/guides/category/*` and all 19 templates -- because each of those routes
declares its own `openGraph` block and Next.js replaces the parent block whole
rather than merging it field by field. Pointing all 78 at `/og.png` would have
closed the audit finding while making every guide, article and template share
look like the home page. The paths written here are the ones
`lib/seo/share-images.ts` declares, and `lib/seo/share-images.test.ts` fails if
the two lists ever disagree or a file goes missing.

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


# The cards. One per section, because a share of a guide, an article or a
# template should say what that section is -- a reader deciding whether to open
# a link on Hacker News gets the section's promise, not the site's.
#
# `eyebrow` is the URL the card stands for, `headline` is what the section
# promises, `sub` is how it delivers it. `out` must match the path the same
# section declares in `lib/seo/share-images.ts`.
CARDS = [
    {
        "out": "og.png",
        "eyebrow": "getopentools.com",
        "headline": "Your files never leave your browser.",
        "sub": (
            "Free PDF, image and text tools that run on your own device. "
            "No upload, no signup, no ads."
        ),
    },
    {
        "out": os.path.join("og", "guides.png"),
        "eyebrow": "getopentools.com/guides",
        "headline": "Guides that show the whole job.",
        "sub": (
            "Step-by-step walkthroughs for every tool, with the limits named "
            "up front and nothing left on a server."
        ),
    },
    {
        "out": os.path.join("og", "blog.png"),
        "eyebrow": "getopentools.com/blog",
        "headline": "How the tools actually work.",
        "sub": (
            "Engineering notes on file formats, browser APIs and the bugs we "
            "found in our own code before you did."
        ),
    },
    {
        "out": os.path.join("og", "templates.png"),
        "eyebrow": "getopentools.com/templates",
        "headline": "Templates you fill in offline.",
        "sub": (
            "Free, open-source starting documents. Customise and download "
            "them without an account."
        ),
    },
]

# The proof, not an adjective. This is the line that earns a sceptic's click:
# it names a policy they can verify in devtools in ten seconds.
CHIP_TEXT = "connect-src 'none'"
CHIP_NOTE = "\u2014 your browser blocks this page from uploading"


def draw_card(card: dict[str, str], tokens: dict[str, str]) -> str:
    """Render one card and return the path written."""
    image = Image.new("RGB", (WIDTH, HEIGHT), tokens["background"])
    draw = ImageDraw.Draw(image)

    # A single accent rule down the left edge. One brand gesture, not five.
    draw.rectangle([0, 0, 10, HEIGHT], fill=tokens["success"])

    headline_font = font(SANS_BOLD, 76)
    sub_font = font(SANS, 31)
    label_font = font(SANS_BOLD, 22)
    mono_font = font(MONO, 25)

    x = MARGIN
    y = MARGIN - 8

    # Wordmark, quiet, so the claim below it is what carries the card.
    draw.text(
        (x, y), card["eyebrow"], font=label_font, fill=tokens["muted-foreground"]
    )
    y += 62

    # The whole section in one sentence. This is what a thumbnail has to land.
    for line in wrap(draw, card["headline"], headline_font, WIDTH - MARGIN * 2):
        draw.text((x, y), line, font=headline_font, fill=tokens["foreground"])
        y += 88
    y += 18

    for line in wrap(draw, card["sub"], sub_font, WIDTH - MARGIN * 2 - 40):
        draw.text((x, y), line, font=sub_font, fill=tokens["muted-foreground"])
        y += 44

    chip_y = HEIGHT - MARGIN - 54
    chip_w = draw.textlength(CHIP_TEXT, font=mono_font) + 40
    draw.rounded_rectangle(
        [x, chip_y, x + chip_w, chip_y + 54], radius=10, fill=tokens["border"]
    )
    draw.text((x + 20, chip_y + 13), CHIP_TEXT, font=mono_font, fill=tokens["success"])
    draw.text(
        (x + chip_w + 20, chip_y + 15),
        CHIP_NOTE,
        font=sub_font,
        fill=tokens["muted-foreground"],
    )

    out = os.path.join(ROOT, "public", card["out"])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    image.save(out, "PNG", optimize=True)
    return out


def main() -> None:
    tokens = dark_tokens()
    for card in CARDS:
        out = draw_card(card, tokens)
        print(f"wrote {out}  {WIDTH}x{HEIGHT}  {os.path.getsize(out):,} bytes")


if __name__ == "__main__":
    main()
