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
           ["/pdf/merge-pdf/", "/pdf/split-pdf/", "/pdf/compress-pdf/"],
           ['class="grid"', 'class="tool"', 'data-kind="pdf"', 'name="description"', '"@type":"ItemList"'])
pdf_tool_slugs = (
    "merge-pdf", "split-pdf", "compress-pdf", "pdf-to-word",
    "edit-pdf", "organize-pdf", "page-numbers", "watermark-pdf",
    "sign-pdf", "protect-pdf", "bengali-ocr",
)
for slug in pdf_tool_slugs:
    check_page(f"pdf/{slug}/index.html", ["/pdf/"], ['rel="canonical"', 'name="description"'])
    check_page(f"tools/{slug}/index.html", [f"/pdf/{slug}/"], ['http-equiv="refresh"'])
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
# PDF and Image Tools are public utilities. Authentication links belong to AI Chat.
account_links = ('href="/?auth=login"', 'href="/?auth=signup"', "href='/?auth=login'", "href='/?auth=signup'")
for tool_dir in ("pdf", "image"):
    for tool_page in (ROOT / tool_dir).rglob("*.html"):
        body = tool_page.read_text(encoding="utf-8")
        if any(link in body for link in account_links):
            errors.append(f"{tool_page}: unexpected login/sign-up link in a public tool")
        if re.search(r">\s*(?:Log in|Sign up)\s*<", body, re.I):
            errors.append(f"{tool_page}: unexpected account control in a public tool")
legacy_pdf_page = ROOT / "tools/image-to-pdf/index.html"
if legacy_pdf_page.exists() and any(link in legacy_pdf_page.read_text(encoding="utf-8") for link in account_links):
    errors.append("tools/image-to-pdf/index.html: unexpected account link")

if errors:
    print("\n".join(f"ERROR: {item}" for item in errors))
    sys.exit(1)
print(f"Validated {len(list(ROOT.rglob('*.html')))} HTML files; PDF/image separation and key navigation are present.")

subprocess.run([sys.executable, str(ROOT / "tests" / "test_sports_backend.py")], cwd=ROOT, check=True)
