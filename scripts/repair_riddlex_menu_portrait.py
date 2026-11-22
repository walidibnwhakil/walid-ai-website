"""One-time repair of the original 720×1280 Riddlex portrait artwork.

The original master artwork has an unintended golden striped block baked into
its wooden desk (rows 1190–1245). Repair the *source pixels* rather than using
the old blurry canvas overlay. All text, detective, cat, and outside frame stay.
This script is only intended for the pristine original, never for reprocessing
an already repaired image.
"""
from __future__ import annotations

from hashlib import sha256
from pathlib import Path

import numpy as np
from PIL import Image

FILE = Path("games/riddlex/images/approved/menu-portrait.webp")
ORIGINAL_SHA256 = "757d860588ff1df2c14ba47b2e106d386d8e1497e48cb7895f4e731e7b6ccb82"

def main() -> None:
    data = FILE.read_bytes()
    current_hash = sha256(data).hexdigest()
    if current_hash != ORIGINAL_SHA256:
        raise SystemExit(f"Refusing to replace non-original menu artwork ({current_hash}).")

    original = np.asarray(Image.open(FILE).convert("RGB"), dtype=np.float32)
    assert original.shape == (1280, 720, 3), original.shape
    repaired = original.copy()

    # The original painting has a contiguous, naturally dark wooden tabletop
    # immediately *above* the unwanted golden stripes. Extrapolate the actual
    # tabletop's wood/grain horizontally, with continuous evening light falloff.
    # No blur, semi-transparent cover, artificial gradient bars, or extra layers.
    y0, y1 = 1140, 1258
    x0, x1 = 42, 693
    ys = np.arange(y0, y1)
    xs = np.arange(x0, x1)
    src_y = 1124 + (ys - y0) * (28 / (y1 - y0))
    lo = np.floor(src_y).astype(int)
    blend = (src_y - lo)[:, None, None]
    wood = (
        original[lo[:, None], xs[None, :]] * (1 - blend)
        + original[(lo + 1)[:, None], xs[None, :]] * blend
    )
    shade = 1 - 0.30 * np.clip((ys - 1150) / 108, 0, 1) ** 1.5
    wood *= shade[:, None, None]

    # Feather only the very edges into the original canvas; preserve all
    # intricate gold-frame scrollwork and the bottom border outside the mask.
    feather_y = np.clip(np.minimum((ys - y0) / 22, (y1 - ys) / 8), 0, 1)
    feather_x = np.clip(np.minimum((xs - x0) / 12, (x1 - xs) / 12), 0, 1)
    alpha = (feather_y[:, None] * feather_x[None, :])[:, :, None]
    repaired[y0:y1, x0:x1] = (
        original[y0:y1, x0:x1] * (1 - alpha) + wood * alpha
    )

    out = Image.fromarray(np.uint8(np.clip(repaired, 0, 255)), "RGB")
    # Lossy WebP, like the original, at high quality; <0.25 MB on mobile.
    out.save(FILE, "WEBP", quality=92, method=6)
    proof = np.asarray(Image.open(FILE).convert("RGB"))
    # The previously bright stripes are now dark timber, not bright gold.
    for y in (1195, 1225, 1235):
        light = float(np.mean(proof[y, 80:650]))
        assert light < 45, (y, light)
    assert FILE.stat().st_size < 260_000
    print(f"Repaired portrait: {FILE.stat().st_size} bytes; outer gold frame retained.")

if __name__ == "__main__":
    main()
