"""Canonical route, favicon, and retired workflow regression checks."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICON = re.compile(r'<link\s+rel="icon"\s+href="/favicon\.ico(?:\?[^"]*)?"')


class CanonicalExpectationTests(unittest.TestCase):
    def test_public_home_and_pdf_favicon_use_current_asset(self):
        for path in ("index.html", "pdf/merge-pdf/index.html"):
            with self.subTest(page=path):
                html = (ROOT / path).read_text(encoding="utf-8")
                self.assertRegex(html, ICON)

    def test_pdf_primary_url_and_legacy_redirect_agree(self):
        canonical = (ROOT / "pdf/merge-pdf/index.html").read_text(encoding="utf-8")
        legacy = (ROOT / "tools/merge-pdf/index.html").read_text(encoding="utf-8")
        self.assertIn('href="https://walid-ai.com/pdf/merge-pdf/"', canonical)
        self.assertIn('href="https://walid-ai.com/pdf/merge-pdf/"', legacy)
        self.assertIn('location.replace("/pdf/merge-pdf/"', legacy)
        usage_test = (ROOT / "tests/test_usage_browser.cjs").read_text(encoding="utf-8")
        self.assertIn("await page.goto('http://127.0.0.1:8765/pdf/merge-pdf/');", usage_test)
        self.assertNotIn("await page.goto('http://127.0.0.1:8765/tools/merge-pdf/');", usage_test)

    def test_home_legal_routes_match_current_directory_urls(self):
        home = (ROOT / "index.html").read_text(encoding="utf-8")
        for slug in ("about-us", "contact-us", "privacy-policy", "terms-of-service"):
            with self.subTest(slug=slug):
                self.assertTrue((ROOT / slug / "index.html").is_file())
                self.assertIn(f'href="/{slug}/"', home)

    def test_retired_html_aliases_are_absent(self):
        aliases = (
            "about-us.html", "contact-us.html", "privacy-policy.html",
            "privacy.html", "terms-of-service.html", "third-party-licenses.html",
            "chat.html", "tools.html", "zip.html", "tool-workspace.html",
            "sections/education.html", "sections/sports.html",
            "guides/bangla-ocr.html", "guides/image-tools.html", "guides/pdf-tools.html",
        )
        sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
        for alias in aliases:
            with self.subTest(alias=alias):
                self.assertFalse((ROOT / alias).exists())
                self.assertNotIn(f"https://walid-ai.com/{alias}<", sitemap)

    def test_old_quran_writers_are_retired(self):
        workflow_root = ROOT / ".github/workflows"
        for name in (
            "install-quran-stable-reader-once.yml",
            "refresh-bismillah-reader-once.yml",
            "refresh-quran-meanings-once.yml",
            "refresh-quran-reader-once.yml",
            "refresh-quran-visible-once.yml",
            "remove-quran-callouts-once.yml",
        ):
            with self.subTest(workflow=name):
                self.assertFalse((workflow_root / name).exists())


if __name__ == "__main__":
    unittest.main()
