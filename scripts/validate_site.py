from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.attrs = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        attrs = dict(attrs)
        self.attrs.append((tag, attrs))
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
    def handle_endtag(self, tag):
        if tag in self.tags:
            self.tags.remove(tag)

def check_html(path):
    parser = Parser()
    text = path.read_text(encoding="utf-8")
    try:
        parser.feed(text)
        parser.close()
    except Exception as exc:
        errors.append(f"{path}: HTML parser error: {exc}")
    if not re.search(r"<!doctype html>", text, re.I):
        errors.append(f"{path}: missing doctype")
    if not re.search(r"<html\\b[^>]*\\blang=", text, re.I):
        errors.append(f"{path}: missing html lang attribute")
    for required in ("<head", "<body", "<title", 'name="description"'):
        if required.lower() not in text.lower():
            errors.append(f"{path}: missing {required}")
    for href in parser.links:
        if href.startswith(("/", "./")):
            target = href.split("#", 1)[0].split("?", 1)[0]
            if not target or target.endswith((".html", "/")):
                candidate = ROOT / target.lstrip("/")
                if target.endswith("/"):
                    candidate = candidate / "index.html"
                if not candidate.exists():
                    errors.append(f"{path}: broken local link {href}")

for path in ROOT.rglob("*.html"):
    if any(part in {".git", "node_modules"} for part in path.parts):
        continue
    check_html(path)

def check_page(relative, required_links, required_markers):
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
           ["/games/riddlex/", "/games/ludo/", "/games/chess/", "/games/tic-tac-toe/", "/games/snakes-and-ladders/", "/games/2048/"],
           ['class="games"', "game-title", "game-subtitle", '"@type":"ItemList"'])
check_page("tools/index.html",
           ["/tools/merge-pdf/", "/tools/split-pdf/", "/tools/compress-pdf/", "/tools/resize-image/", "/tools/compress-image/", "/tools/convert-image/", "/tools/background-remover/", "/zip.html#tool=create"],
           ['class="grid"', 'class="tool"', 'data-kind="pdf"', 'data-kind="image"', 'data-kind="archive"', '"@type":"ItemList"'])

if errors:
    print("\n".join(f"ERROR: {item}" for item in errors))
    sys.exit(1)
print(f"Validated {len(list(ROOT.rglob('*.html')))} HTML files; key Games/Tools links and structure are present.")
