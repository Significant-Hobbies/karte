"""Outline the authored specimen with bundled Geist (fontTools + brotli).

Run: uv run --with fonttools --with brotli scripts/build-landing-specimen.py
The generated SVG is checked in; normal app builds need no Python dependency.
"""

from pathlib import Path
import xml.etree.ElementTree as ET

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
SVG = "{http://www.w3.org/2000/svg}"
ET.register_namespace("", SVG[1:-1])
FONT = ROOT / "landing-astro/node_modules/@saas-maker/ui/src/fonts/geist-latin-normal.woff2"
SOURCE = ROOT / "landing-astro/src/content/specimen.svg"
OUTPUT = ROOT / "landing-astro/public/images/specimen.svg"


def build():
    base = TTFont(FONT)
    fonts = {}
    tree = ET.parse(SOURCE)
    definitions = ET.Element(SVG + "defs")
    tree.getroot().insert(1, definitions)
    outlined = set()
    for parent in tree.iter():
        for element in list(parent):
            if element.tag != SVG + "text":
                continue
            weight = int(element.get("font-weight", "400"))
            if weight not in fonts:
                fonts[weight] = instantiateVariableFont(base, {"wght": weight})
            font = fonts[weight]
            glyphs = font.getGlyphSet()
            cmap = font.getBestCmap()
            scale = float(element.get("font-size")) / font["head"].unitsPerEm
            tracking = float(element.get("letter-spacing", "0"))
            text = element.text or ""
            names = [cmap[ord(char)] for char in text]
            advances = [font["hmtx"][name][0] * scale + tracking for name in names]
            width = sum(advances) - tracking
            x, y = float(element.get("x")), float(element.get("y"))
            anchor = element.get("text-anchor")
            x -= width if anchor == "end" else width / 2 if anchor == "middle" else 0
            group = ET.Element(SVG + "g", {"aria-label": text})
            if element.get("fill"):
                group.set("fill", element.get("fill"))
            for name, advance in zip(names, advances):
                glyph_id = f"geist-{weight}-{name}"
                if glyph_id not in outlined:
                    pen = SVGPathPen(glyphs, ntos=lambda value: f"{value:.2f}".rstrip("0").rstrip("."))
                    glyphs[name].draw(pen)
                    ET.SubElement(definitions, SVG + "path", {"id": glyph_id, "d": pen.getCommands()})
                    outlined.add(glyph_id)
                if name != "space":
                    ET.SubElement(group, SVG + "use", {
                        "href": f"#{glyph_id}",
                        "transform": f"translate({x:.4f} {y:g}) scale({scale:g} {-scale:g})",
                    })
                x += advance
            index = list(parent).index(element)
            parent.remove(element)
            parent.insert(index, group)
    tree.write(OUTPUT, encoding="utf-8", xml_declaration=True)


if __name__ == "__main__":
    build()
