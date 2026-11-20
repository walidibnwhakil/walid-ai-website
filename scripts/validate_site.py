from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import subprocess
ROOT = Path(__file__).resolve().parents[1]
errors = []
class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
def check_html(path):
    parser = Parser()
    text = path.read_text(encoding="utf-8")
    try:
        parser.feed(text)
        parser.close()
    except Exception as exc:
        errors.append(f"{path}: HTML parser error: {exc}")
    for required in ("<!doctype html>", "<html", "<head", "<body", "<title"):
        if required.lower() not in text.lower():
            errors.append(f"{path}: missing {required}")
    if not re.search(r"<html\b[^>]*\blang=", text, re.I):
        errors.append(f"{path}: missing html lang attribute")
    for href in parser.links:
        if href.startswith(("/", "./")):
            target = href.split("#", 1)[0].split("?", 1)[0]
            if target.endswith((".html", "/")):
                candidate = ROOT / target.lstrip("/")
                if target.endswith("/"):
                    candidate /= "index.html"
                if not candidate.exists():
                    errors.append(f"{path}: broken local link {href}")
for path in ROOT.rglob("*.html"):
    if any(part in {".git", "node_modules"} for part in path.parts):
        continue
    check_html(path)
def check_page(relative, required_links, required_markers=()):
    path = ROOT / relative
    if not path.exists():
        errors.append(f"{relative}: page missing")
        return
    text = path.read_text(encoding="utf-8")
    for link in required_links:
        if f'href="{link}"' not in text and f"href='{link}'" not in text:
            errors.append(f"{relative}: missing key link {link}")
    for marker in required_markers:
        if marker not in text:
            errors.append(f"{relative}: missing structure marker {marker}")
check_page("games/index.html",
           ["/games/riddlex/", "/games/ludo/", "/games/chess/",
            "/games/tic-tac-toe/", "/games/snakes-and-ladders/", "/games/2048/"],
           ['class="games"', "game-title", "game-subtitle", 'name="description"', '"@type":"ItemList"'])
check_page("pdf/index.html",
           ["/tools/merge-pdf/", "/tools/split-pdf/", "/tools/compress-pdf/"],
           ['class="grid"', 'class="tool"', 'data-kind="pdf"', 'name="description"', '"@type":"ItemList"'])
image_tool_slugs = (
    "resize-image", "compress-image", "convert-image",
    "background-remover", "signature-remover", "watermark-remover",
)
image_tool_links = [f"/image/{slug}/" for slug in image_tool_slugs]
check_page("image/index.html", image_tool_links,
           ['class="grid"', 'class="tool"', 'name="description"'])
check_page("guides/image-tools/index.html", image_tool_links,
           ['name="description"'])
for slug in image_tool_slugs:
    check_page(f"image/{slug}/index.html", ["/image/"],
               ['rel="canonical"', 'name="description"'])
    check_page(f"tools/{slug}/index.html", [f"/image/{slug}/"],
               ['http-equiv="refresh"'])
tools_parser = Parser()
tools_parser.feed((ROOT / "pdf/index.html").read_text(encoding="utf-8"))
for image_link in [*image_tool_links, *(f"/tools/{slug}/" for slug in image_tool_slugs)]:
    if image_link in tools_parser.links:
        errors.append(f"pdf/index.html: image tool leaked into PDF-only page: {image_link}")
if errors:
    print("\n".join(f"ERROR: {item}" for item in errors))
    sys.exit(1)
print(f"Validated {len(list(ROOT.rglob('*.html')))} HTML files; PDF/image separation and key navigation are present.")

subprocess.run([sys.executable, str(ROOT / "tests" / "test_sports_backend.py")], cwd=ROOT, check=True)
