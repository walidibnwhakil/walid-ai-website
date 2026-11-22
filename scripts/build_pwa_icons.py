"""Generate transparent 192px and 512px PWA icons using the approved flower.

Only scales and centers the original RGBA PNG on a transparent square.
No backgrounds, round corners, masks, or replacement artwork. Standard
library only, so publishing does not require installing external packages.
"""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "walid-ai-approved-flower.png"
DEST = ROOT / "pwa"
SIGNATURE = b"\x89PNG\r\n\x1a\n"


def parse_png(path):
    data = path.read_bytes()
    if not data.startswith(SIGNATURE):
        raise ValueError("Approved flower is not PNG")
    offset, idat, width, height = 8, bytearray(), None, None
    while offset < len(data):
        n = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4:offset + 8]
        content = data[offset + 8:offset + 8 + n]
        offset += n + 12
        if kind == b"IHDR":
            width, height, depth, color, _c, _f, interlace = struct.unpack(">IIBBBBB", content)
            if (depth, color, interlace) != (8, 6, 0):
                raise ValueError("Approved flower must be non-interlaced RGBA PNG")
        elif kind == b"IDAT":
            idat.extend(content)
        elif kind == b"IEND":
            break
    if not width or not height:
        raise ValueError("Missing image dimensions")
    decoded = zlib.decompress(idat)
    width_bytes = width * 4
    rows, pos, previous = [], 0, bytearray(width_bytes)
    for _ in range(height):
        kind = decoded[pos]
        pos += 1
        row = bytearray(decoded[pos:pos + width_bytes])
        pos += width_bytes
        if len(row) != width_bytes:
            raise ValueError("Truncated PNG scanline")
        for i in range(width_bytes):
            a = row[i - 4] if i >= 4 else 0
            b = previous[i]
            c = previous[i - 4] if i >= 4 else 0
            if kind == 1:
                row[i] = (row[i] + a) & 255
            elif kind == 2:
                row[i] = (row[i] + b) & 255
            elif kind == 3:
                row[i] = (row[i] + (a + b) // 2) & 255
            elif kind == 4:
                p = a + b - c
                da, db, dc = abs(p - a), abs(p - b), abs(p - c)
                chosen = a if da <= db and da <= dc else b if db <= dc else c
                row[i] = (row[i] + chosen) & 255
            elif kind != 0:
                raise ValueError("Unsupported PNG filter")
        rows.append(row)
        previous = row
    return width, height, rows


def chunk(kind, payload):
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload))


def generate(width, height, pixels, size, destination):
    scale = size / max(width, height)
    w, h = round(width * scale), round(height * scale)
    left, top = (size - w) // 2, (size - h) // 2
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        line = bytearray(size * 4)
        if top <= y < top + h:
            sy = min(height - 1, max(0.0, (y - top + 0.5) / scale - 0.5))
            iy, dy = int(sy), sy - int(sy)
            iy2 = min(iy + 1, height - 1)
            for x in range(left, left + w):
                sx = min(width - 1, max(0.0, (x - left + 0.5) / scale - 0.5))
                ix, dx = int(sx), sx - int(sx)
                ix2 = min(ix + 1, width - 1)
                sample = ((pixels[iy], ix, (1 - dx) * (1 - dy)),
                          (pixels[iy], ix2, dx * (1 - dy)),
                          (pixels[iy2], ix, (1 - dx) * dy),
                          (pixels[iy2], ix2, dx * dy))
                alpha = sum(r[px * 4 + 3] * weight for r, px, weight in sample)
                if alpha > 0:
                    for ch in range(3):
                        weighted = sum(r[px * 4 + ch] * r[px * 4 + 3] * weight for r, px, weight in sample)
                        line[x * 4 + ch] = min(255, round(weighted / alpha))
                    line[x * 4 + 3] = min(255, round(alpha))
        raw.extend(line)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = SIGNATURE + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    destination.write_bytes(png)
    print(f"{destination.relative_to(ROOT)}: {size}x{size}, transparent flower, {len(png)} bytes")


def main():
    width, height, rows = parse_png(SOURCE)
    DEST.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        generate(width, height, rows, size, DEST / f"icon-{size}.png")


if __name__ == "__main__":
    main()
