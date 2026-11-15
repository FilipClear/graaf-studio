"""Render the supplied Handflair outlines into inline SVG writing masks.

Run with Python + fontTools after changing the signature names or font.
The normal HTML text remains the accessible/no-JavaScript fallback.
"""
from pathlib import Path
import re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.perimeterPen import PerimeterPen

root = Path(__file__).resolve().parent.parent
font = TTFont(root / 'assets/Handflair.otf')
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
kerns = {}
for lookup in font['GPOS'].table.LookupList.Lookup:
    if lookup.LookupType != 2:
        continue
    for table in lookup.SubTable:
        if table.Format != 1:
            continue
        for first, pairs in zip(table.Coverage.glyphs, table.PairSet):
            for pair in pairs.PairValueRecord:
                kerns[first, pair.SecondGlyph] = getattr(pair.Value1, 'XAdvance', 0)

html = (root / 'index.html').read_text(encoding='utf-8')
for key, name in [('christopher', 'Christopher B.'), ('jimmy', 'Jimmy K.'), ('krish', 'Krish N.')]:
    definitions, letters = [], []
    x = 0
    previous = None
    for index, character in enumerate(name):
        glyph_name = cmap[ord(character)]
        x += kerns.get((previous, glyph_name), 0)
        glyph = glyphs[glyph_name]
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        path = pen.getCommands()
        if path:
            measure = PerimeterPen(glyphs)
            glyph.draw(measure)
            identifier = f'ink-{key}-{index}'
            definitions.append(f'<path id="{identifier}" d="{path}"/>')
            definitions.append(f'<mask id="{identifier}-mask" maskUnits="userSpaceOnUse" x="-1000" y="-1200" width="3000" height="2400"><use class="signature-pen" href="#{identifier}" pathLength="1" data-length="{measure.value:.1f}"/></mask>')
            # pathLength belongs on the original path, and is inherited by <use>.
            definitions[-2] = definitions[-2].replace(' d=', ' pathLength="1" d=')
            letters.append(f'<use class="signature-ink" href="#{identifier}" transform="translate({x} 0)" mask="url(#{identifier}-mask)"/>')
        x += glyph.width
        previous = glyph_name
    svg = f'<svg class="signature-drawing" width="{x * .048:g}" height="59.52" viewBox="0 0 {x} 1240" aria-hidden="true" focusable="false"><defs>{"".join(definitions)}</defs><g transform="translate(0 840) scale(1 -1)">{"".join(letters)}</g></svg>'
    start, end = f'<!-- signature:{key} -->', f'<!-- /signature:{key} -->'
    block = start + svg + end
    if end in html:
        html = re.sub(re.escape(start) + r'.*?' + re.escape(end), lambda _: block, html, flags=re.S)
    else:
        html = html.replace(start, block)
(root / 'index.html').write_text(html, encoding='utf-8')
