"""Build a minimized, standalone Snakes & Ladders distribution.
Run from the website repository root: python3 scripts/build-itch-snakes.py
Only the explicit runtime allowlist is copied; no personal or admin files.
"""
import pathlib, re, struct, zipfile
from io import BytesIO

ROOT = pathlib.Path(__file__).resolve().parents[1]
GAME = ROOT / "games/snakes-and-ladders"
OUT = ROOT / "dist-itch" / "snakes-and-ladders.zip"
MODULES = """cavern-eyes cinematic engine fireworks game jungle-life lava menu-scene
performance results serpent-renderer snake-entry-mesh snake-geometry""".split()
ASSETS = """cavern-mobile cavern cobra-cinema defeat-title joined-heads-open joined-heads
jungle-emblem-small jungle-emblem jungle-life-ready jungle-life jungle-menu-small jungle-menu
lava-mobile-ready lava-ready marble-atlas natural-heads natural-skin river-ready royal-logo
serpent-heads victory-emblem""".split()
DENY = re.compile(r"(?i)(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:api[_-]?key|access[_-]?key|private[_-]?key|password)\s*[:=]|-----BEGIN [A-Z ]*PRIVATE KEY-----|walidAdminAccess|firebase|/admin/)")
def safe_text(value, name):
    if DENY.search(value):
        raise ValueError("Private-data indicator in " + name)
    return value.encode("utf-8")

def clean_webp(data):
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Not a WebP file")
    chunks = []
    pos = 12
    while pos < len(data):
        tag = data[pos:pos+4]
        size = struct.unpack_from("<I", data, pos+4)[0]
        end = pos + 8 + size + (size % 2)
        if end > len(data):
            raise ValueError("Truncated WebP chunk")
        payload = data[pos+8:pos+8+size]
        if tag not in (b"EXIF", b"XMP "):
            if tag == b"VP8X":
                payload = bytes([payload[0] & ~0x0c]) + payload[1:]
            chunks.append(tag + struct.pack("<I", len(payload)) + payload + (b"\0" if len(payload)%2 else b""))
        pos = end
    body = b"WEBP" + b"".join(chunks)
    return b"RIFF" + struct.pack("<I", len(body)) + body

def build():
    files = {}
    html = (GAME/"index.html").read_text(encoding="utf-8")
    html = re.sub(r'<link\b[^>]*href="/[^"]+"[^>]*>', "", html)
    html = re.sub(r'<script\s+src="/usage\.js[^"]*"></script>', "", html)
    html = re.sub(r'<footer class="legal-footer">.*?</footer>', "", html, flags=re.S)
    html = html.replace('href="/games/"', 'href="https://walid-ai.com/games/" target="_blank" rel="noopener noreferrer"')
    files["index.html"] = safe_text(html, "index.html")
    files["style.css"] = safe_text((GAME/"style.css").read_text(encoding="utf-8"),"style.css")
    for name in MODULES:
        path = name + ".mjs"
        code = (GAME/path).read_text(encoding="utf-8")
        code = code.replace("../refresh-guard.mjs", "./refresh-guard.mjs")
        code = code.replace('location.assign(new URL("/games/", location.origin).href);', 'window.open("https://walid-ai.com/games/", "_blank", "noopener,noreferrer");')
        files[path] = safe_text(code,path)
    files["refresh-guard.mjs"] = safe_text((ROOT/"games/refresh-guard.mjs").read_text(encoding="utf-8"),"refresh-guard.mjs")
    for name in ASSETS:
        path = "assets/" + name + ".webp"
        files[path] = clean_webp((GAME/path).read_bytes())
    files["README.txt"] = b"Snakes & Ladders - The Serpent King's Realm\nPublisher: Walid AI\nOfficial site: https://walid-ai.com/games/snakes-and-ladders/\nCopyright 2026 Walid AI. All rights reserved.\nContains generated artwork. No website analytics included in this package.\nPlay against a bot or with 2-4 local players.\n"
    for name, data in files.items():
        if name.endswith((".html",".css",".mjs")):
            source = data.decode("utf-8")
            for rel in re.findall(r'(?:from\s+|src=|href=)["\x27](\./[^"\x27]+)["\x27]',source):
                assert rel[2:].split("?")[0] in files, (name,rel)
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT,"w",zipfile.ZIP_DEFLATED) as z:
        for name, data in sorted(files.items()):
            z.writestr(name,data)
    with zipfile.ZipFile(OUT) as z:
        assert z.testzip() is None
        assert set(z.namelist()) == set(files)
    print("Built", OUT.name, "with", len(files), "allowlisted files")

if __name__ == "__main__":
    build()
