# Smaller WebP copies of every photo in img/, for srcset: 640 px for cards and 1280 px for wide images.
# The original stays and is what the lightbox opens. Run after adding or replacing a photo:
#   python tools/make-webp.py
# then give the new <img> a srcset like the others, e.g.
#   srcset="img/sm/NAME-640.webp 640w, img/sm/NAME-1280.webp 1280w" sizes="(max-width: 700px) 92vw, 351px"
# (for a photo narrower than 1280 px, the last candidate is the original: img/NAME.jpg <its width>w).
import os
import sys
from PIL import Image

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "img")
out = os.path.join(root, "sm")
os.makedirs(out, exist_ok=True)
for name in sorted(os.listdir(root)):
    src = os.path.join(root, name)
    if not os.path.isfile(src) or not name.lower().endswith((".jpg", ".jpeg", ".png")):
        continue
    im = Image.open(src)
    im.load()
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    base, (w, h) = os.path.splitext(name)[0], im.size
    for target in (640, 1280):
        if target > w and target != 640:
            continue  # no 1280 copy of a smaller photo: the original serves instead
        size = (target, round(h * target / w)) if w > target else (w, h)
        (im.resize(size, Image.LANCZOS) if size != (w, h) else im).save(os.path.join(out, f"{base}-{target}.webp"), "WEBP", quality=80, method=6)
    print(f"{name}: {w}x{h}")
