"""Build price fonts with the dirham sign aligned to the numeral ink bounds.

Requires fonttools==4.67.0 and brotli==1.2.1. Pass --source-dir containing the
Google Fonts Fraunces.ttf / Roboto.ttf and their *-OFL.txt licenses.
Source URLs and checksums are recorded beside the generated assets.
"""
import argparse
import hashlib
import json
from pathlib import Path

from fontTools import subset
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, required=True)
args = parser.parse_args()
donor = TTFont(ROOT / 'mobile/assets/fonts/dirham.ttf')
donor_name = donor.getBestCmap()[0x20C3]
donor_glyph = donor['glyf'][donor_name]
records = []

for source, weight, dest, flavor in [
    ('Fraunces', 600, 'admin/src/assets/fonts/dirham-price.woff2', 'woff2'),
    ('Roboto', 700, 'mobile/assets/fonts/dirham-price-700.ttf', None),
    ('Roboto', 800, 'mobile/assets/fonts/dirham-price-800.ttf', None),
    ('Roboto', 900, 'mobile/assets/fonts/dirham-price-900.ttf', None),
]:
    raw = (args.source_dir / f'{source}.ttf').read_bytes()
    font = TTFont(args.source_dir / f'{source}.ttf')
    axes = {a.axisTag: a.defaultValue for a in font['fvar'].axes}
    axes['wght'] = weight
    if 'opsz' in axes:
        axes['opsz'] = 24
    font = instantiateVariableFont(font, axes)
    digits = [font['glyf'][font.getBestCmap()[ord(c)]] for c in '0123456789']
    bottom = min(g.yMin for g in digits)
    top = max(g.yMax for g in digits)
    scale = (top - bottom) / (donor_glyph.yMax - donor_glyph.yMin)
    name = 'dirham.matched'
    pen = TTGlyphPen(None)
    donor.getGlyphSet()[donor_name].draw(TransformPen(pen, (
        scale, 0, 0, scale, -donor_glyph.xMin * scale,
        bottom - donor_glyph.yMin * scale,
    )))
    order = list(font.getGlyphOrder())
    font['glyf'][name] = pen.glyph()
    font.setGlyphOrder(order + [name])
    advance = round((donor_glyph.xMax - donor_glyph.xMin) * scale)
    font['hmtx'][name] = (advance, 0)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[0x20C3] = name
    family = 'Il Mio Price Serif' if source == 'Fraunces' else 'Il Mio Price Sans'
    for record in font['name'].names:
        values = {1: family, 2: 'Regular', 3: f'{family}-{weight}-1.0',
                  4: f'{family} {weight}', 6: family.replace(' ', '') + f'-{weight}',
                  16: family, 17: 'Regular'}
        if record.nameID in values:
            record.string = values[record.nameID].encode(record.getEncoding())
    options = subset.Options()
    # Fixed numeric outlines: optical/figure substitutions must not change the
    # bounds against which the symbol is aligned.
    options.layout_features = []
    options.name_IDs = ['*']
    cutter = subset.Subsetter(options=options)
    cutter.populate(unicodes=[ord(c) for c in '0123456789., +-()€$—\u00a0\u20c3'])
    cutter.subset(font)
    font.flavor = flavor
    output = ROOT / dest
    font.save(output)
    check = TTFont(output)
    symbol = check['glyf'][check.getBestCmap()[0x20C3]]
    assert (symbol.yMin, symbol.yMax) == (bottom, top)
    record = {'font': dest, 'source': f'https://github.com/google/fonts/tree/main/ofl/{source.lower()}',
              'source_sha256': hashlib.sha256(raw).hexdigest(), 'weight': weight,
              'units_per_em': check['head'].unitsPerEm, 'numeral_bounds': [bottom, top],
              'symbol_bounds': [symbol.yMin, symbol.yMax]}
    records.append(record)
    (output.parent / f'{source}-OFL.txt').write_bytes((args.source_dir / f'{source}-OFL.txt').read_bytes())
    print(dest, 'numerals and sign:', bottom, top)

(ROOT / 'docs/price-font-metrics.json').write_text(json.dumps(records, indent=2) + '\n')
