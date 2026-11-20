"""Bakes the portrait photograph into the two images the hero uses.

    python tools/bake_portrait.py [photo] [output folder]

    photo           defaults to tools/portrait-source.jpg
    output folder   defaults to assets/

Writes:
    portrait-map.png   what the letters are drawn from: red = tone, green = depth, blue = outline
    portrait.jpg       the same crop in colour, shown when the pointer rests on the portrait

Needs numpy, Pillow and scipy. Add --preview to also write tools/preview.png (the three maps side by side).
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
src = args[0] if args else os.path.join(HERE, 'portrait-source.jpg')
out = args[1] if len(args) > 1 else os.path.join(HERE, '..', 'assets')
CROP = (330, 50, 1570, 1538)      # head, neck and the top of the shoulders
W, H = 300, 360                   # working size of every map

im = Image.open(src).convert('RGB')
rgb_full = np.asarray(im).astype(np.float32) / 255.0

# outline: everything that is not near-white paper connected to the border
white = rgb_full.min(axis=2) > 0.925
labels, _ = ndi.label(white)
edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
background = np.isin(labels, edge[edge > 0])
alpha_full = ndi.binary_erosion(~background, iterations=3).astype(np.float32)

x0, y0, x1, y1 = CROP
def fit(a):
    return np.asarray(Image.fromarray((np.clip(a[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32) / 255.0

lum_full = rgb_full @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
alpha = fit(alpha_full)
lum = fit(lum_full)

# tone: a little local contrast so the eyes and mouth survive being turned into dots
tone = np.clip(lum + 0.7 * (lum - ndi.gaussian_filter(lum, 5)), 0, 1)
tone = np.where(alpha > 0.5, tone, 1.0)

# depth: the outline inflated like a cushion, the head pushed forward, a trace of facial relief
solid = alpha > 0.5
dist = ndi.distance_transform_edt(solid)
dome = np.sqrt(np.clip(1 - (1 - np.clip(dist / 52.0, 0, 1)) ** 2, 0, 1))
yy, xx = np.mgrid[0:H, 0:W]
head = np.exp(-(((xx - 0.50 * W) / (0.24 * W)) ** 2 + ((yy - 0.40 * H) / (0.27 * H)) ** 2))
relief = ndi.gaussian_filter(lum, 2.5) - ndi.gaussian_filter(lum, 11)
depth = dome * (0.5 + 0.42 * head) + 0.22 * relief * head
depth = np.clip(ndi.gaussian_filter(depth, 2.2), 0, 1) * solid

packed = np.dstack([tone, depth, alpha])
png = Image.fromarray((packed * 255).astype(np.uint8), 'RGB')
png.save(os.path.join(out, 'portrait-map.png'), 'PNG', optimize=True)
im.crop(CROP).resize((750, 900), Image.LANCZOS).save(os.path.join(out, 'portrait.jpg'), quality=84)
if '--preview' in sys.argv:
    sheet = np.hstack([tone, depth, alpha])
    Image.fromarray((sheet * 255).astype(np.uint8)).resize((W * 3 * 2, H * 2), Image.NEAREST).save(os.path.join(HERE, 'preview.png'))
print('portrait-map.png', os.path.getsize(os.path.join(out, 'portrait-map.png')) // 1024, 'KB')
