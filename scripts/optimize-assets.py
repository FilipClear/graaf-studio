"""Build responsive WebP artwork from the original files (requires Pillow)."""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parent.parent / 'assets'
for name, widths in [
    ('work-center', (480, 960, 1280, 1920, 2400)),
    ('work-left', (480, 960, 1280, 1920, 2400)),
    ('work-right', (480, 960, 1280, 1920, 2400)),
    ('gallery-character-render', (384, 768)),
]:
    with Image.open(assets / f'{name}.png') as original:
        for width in widths:
            height = round(original.height * width / original.width)
            output = assets / f'{name}-{width}.webp'
            original.resize((width, height), Image.Resampling.LANCZOS).save(
                output, 'WEBP', quality=88, method=6
            )
            print(f'{output.name}: {output.stat().st_size:,} bytes')
