#!/usr/bin/env python3
"""Compress the room art and cut feathered face crops for the overlays."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
APPROVED = ROOT / "images" / "approved"
UPLOADS = Path("/home/ubuntu/.cursor/projects/agent-repos-walid-ai-website/uploads")

LAND_FACE = (617, 24, 1155, 381)
PORT_FACE = (172, 167, 548, 499)


def load_rgb(path, size=None):
    image = Image.open(path).convert("RGB")
    if size and image.size != size:
        image = image.resize(size, Image.Resampling.LANCZOS)
    return image


def best_shift(base, other, box, rad=6):
    x0, y0, x1, y1 = box
    y1s = y0 + max(12, int((y1 - y0) * 0.28))
    patch = np.asarray(base.crop((x0, y0, x1, y1s)), dtype=np.float32)
    other_px = np.asarray(other, dtype=np.float32)
    best = (1e18, 0, 0)
    for dy in range(-rad, rad + 1):
        for dx in range(-rad, rad + 1):
            sl = other_px[y0 + dy:y1s + dy, x0 + dx:x1 + dx]
            if sl.shape != patch.shape:
                continue
            err = float(np.mean(np.abs(sl - patch)))
            if err < best[0]:
                best = (err, dx, dy)
    zero = float(np.mean(np.abs(other_px[y0:y1s, x0:x1] - patch)))
    if best[0] > zero - 1.25:
        return 0, 0
    return best[1], best[2]


def feather(image, fade):
    width, height = image.size
    mask = np.zeros((height, width), dtype=np.float32)
    inset = max(1, fade)
    mask[inset:height - inset, inset:width - inset] = 1
    alpha = Image.fromarray(np.clip(mask * 255, 0, 255).astype(np.uint8), "L")
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=max(1, fade * 0.55)))
    out = image.convert("RGBA")
    out.putalpha(alpha)
    return out


def save_webp(image, path, quality):
    image.save(path, "WEBP", quality=quality, method=6)
    return path.stat().st_size


def crop_face(base, source, box, dest, fade):
    frame = load_rgb(source, base.size)
    dx, dy = best_shift(base, frame, box)
    x0, y0, x1, y1 = box
    crop = feather(frame.crop((x0 + dx, y0 + dy, x1 + dx, y1 + dy)), fade)
    size = save_webp(crop, dest, 80)
    print(f"{dest.name} {size} shift {dx},{dy}")


def main():
    desk = load_rgb(APPROVED / "game-desk.png")
    portrait = load_rgb(APPROVED / "portrait-neutral.webp")
    menu = load_rgb(APPROVED / "menu-card.png")
    print("menu-desk", save_webp(menu, APPROVED / "menu-desk.webp", 78))
    blur = menu.resize((240, 135), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(radius=6))
    blur = Image.eval(blur, lambda px: int(px * 0.4))
    print("menu-blur", save_webp(blur, APPROVED / "menu-blur.webp", 60))
    print("game-desk", save_webp(desk, APPROVED / "game-desk.webp", 78))

    pairs = {
        "landscape": (desk, LAND_FACE, 22, {
            "happy": APPROVED / "expression-happy.webp",
            "sad": APPROVED / "expression-sad.webp",
            "worried": APPROVED / "expression-worried.webp",
            "serious": UPLOADS / "landscape-serious_caec.jpg",
            "confused": UPLOADS / "landscape-confused_2315.jpg",
        }),
        "portrait": (portrait, PORT_FACE, 18, {
            "happy": APPROVED / "portrait-happy.webp",
            "sad": APPROVED / "portrait-sad.webp",
            "worried": APPROVED / "portrait-worried.webp",
            "serious": UPLOADS / "portrait-serious_c5a2.jpg",
            "confused": UPLOADS / "portrait-confused_9316.jpg",
        }),
    }
    for orient, (base, box, fade, sources) in pairs.items():
        for name, path in sources.items():
            if not path.exists():
                print("missing", path.name)
                continue
            crop_face(base, path, box, APPROVED / f"face-{orient}-{name}.webp", fade)


if __name__ == "__main__":
    main()
