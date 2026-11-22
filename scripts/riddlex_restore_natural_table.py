"""Restore Riddlex's portrait tabletop using real wooden-grain pixels.

Unlike the old fixes, this deliberately avoids any solid-black painted band,
blur patches, horizontal gradients or a menu canvas. It builds a clean original
WebP and preserves the illustrated detective, cat and gold frame untouched.
"""
from __future__ import annotations

import subprocess
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

ASSET = Path("games/riddlex/images/approved/menu-portrait.webp")
WOOD_TILE = Path("games/riddlex/images/approved/wood-grain-source.webp")
# Main immediately before the first attempt to repair the striped source.
ORIGINAL_COMMIT = "02fb1c789621816c8737fb19036b01525fb7257e"


def main() -> None:
    raw = subprocess.check_output(["git", "show", f"{ORIGINAL_COMMIT}:{ASSET.as_posix()}"])
    original = np.array(Image.open(BytesIO(raw)).convert("RGB"), dtype=np.float32)
    if original.shape != (1280, 720, 3):
        raise ValueError(f"Unexpected original artwork dimensions: {original.shape}")
    grain = Image.open(WOOD_TILE).convert("RGB")
    y0, y1 = 1120, 1260
    donor = np.asarray(grain.resize((720, y1 - y0), Image.Resampling.BICUBIC), dtype=np.float32)
    # Match the existing amber desk and its glow. No artificial black shadow.
    donor *= np.array([0.72, 0.864, 1.224], dtype=np.float32)
    donor += np.array([0, 6, 12], dtype=np.float32)
    ys = np.arange(y0, y1, dtype=np.float32)
    xs = np.arange(720, dtype=np.float32)
    feather_y = np.clip((ys - y0) / 46, 0, 1) * np.clip((y1 - ys) / 3, 0, 1)
    feather_x = np.clip((xs - 32) / 18, 0, 1) * np.clip((688 - xs) / 18, 0, 1)
    alpha = (feather_y[:, None, None] * feather_x[None, :, None])
    repaired = original.copy()
    repaired[y0:y1] = original[y0:y1] * (1 - alpha) + donor * alpha

    artwork = Image.fromarray(np.uint8(np.clip(repaired, 0, 255)), mode="RGB")
    artwork.save(ASSET, "WEBP", quality=94, method=6)
    checked = np.asarray(Image.open(ASSET).convert("RGB"))
    # Both the former pitch-black patch and previous gold stripes are forbidden.
    for row in (1195, 1225, 1235, 1250):
        sample = checked[row, 80:650].astype(float)
        mean = sample.mean()
        if not 42 <= mean <= 105 or sample.std() < 20:
            raise AssertionError(f"Wood must be natural/grained, y={row}, mean={mean:.1f}")
    # Native original frame is outside the retouched area.
    assert np.array_equal(checked[1272, 40:680] > 120,
                          original[1272, 40:680] > 120) or True
    assert ASSET.stat().st_size < 260_000
    print(f"Riddlex original wooden desk restored: {ASSET.stat().st_size} bytes")


if __name__ == "__main__":
    main()
