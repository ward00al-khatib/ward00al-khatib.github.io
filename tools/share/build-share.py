"""Photographs the share cards and the LinkedIn banner with headless Chrome.

    python tools/share/build-share.py
    python tools/share/build-share.py --banner-to "D:/ward-social/linkedin"

share-en.html -> img/share/home-en.jpg   (og:image of the English home page)
share-ar.html -> img/share/home-ar.jpg   (build-ar.js swaps it in on /ar/)
banner.html   -> <banner-to>/linkedin-banner.jpg, at twice LinkedIn's 1584x396 so it stays sharp

Edit the HTML or share.css, run this, then run node tools/build-ar.js.
"""
import argparse
import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

ap = argparse.ArgumentParser()
ap.add_argument("--banner-to", default=r"D:\ward-social\linkedin")
args = ap.parse_args()

JOBS = [
    ("share-en.html", (1200, 630), 1, ROOT / "img" / "share" / "home-en.jpg"),
    ("share-ar.html", (1200, 630), 1, ROOT / "img" / "share" / "home-ar.jpg"),
    ("banner.html", (1584, 396), 2, Path(args.banner_to) / "linkedin-banner.jpg"),
]

for src, (w, h), scale, out in JOBS:
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        png = Path(tmp) / "shot.png"
        subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--force-device-scale-factor={scale}",
             f"--window-size={w},{h}", "--virtual-time-budget=4000", f"--screenshot={png}", (HERE / src).as_uri()],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        im = Image.open(png).convert("RGB")
        if im.size != (w * scale, h * scale):
            raise SystemExit(f"{src}: Chrome gave {im.size}, expected {(w * scale, h * scale)}")
        im.save(out, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"{out}  {im.size[0]}x{im.size[1]}  {out.stat().st_size // 1024} KB")
