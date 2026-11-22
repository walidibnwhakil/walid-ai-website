"""PWA installability and original-icon preservation checks."""
import json
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PwaManifestChecks(unittest.TestCase):
    def test_manifest_identity_and_unmasked_png_sizes(self):
        manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual(manifest["name"], "Walid AI")
        self.assertEqual(manifest["id"], "/")
        self.assertEqual(manifest["start_url"], "/")
        self.assertEqual(manifest["scope"], "/")
        self.assertEqual(manifest["display"], "standalone")
        icons = manifest["icons"]
        self.assertEqual({i["sizes"] for i in icons}, {"192x192", "512x512"})
        for icon in icons:
            self.assertEqual(icon["purpose"], "any")
            self.assertEqual(icon["type"], "image/png")
            file = ROOT / icon["src"].lstrip("/")
            data = file.read_bytes()
            self.assertEqual(data[:8], b"\x89PNG\r\n\x1a\n")
            width, height, depth, color = struct.unpack_from(">IIBB", data, 16)
            size = int(icon["sizes"].split("x")[0])
            self.assertEqual((width, height, depth, color), (size, size, 8, 6))

    def test_hubs_link_manifest_without_changing_original_brand(self):
        paths = [
            "index.html", "chat/index.html", "pdf/index.html", "image/index.html",
            "games/index.html", "islam/index.html", "others/index.html",
            "sections/education/index.html", "sports/index.html",
        ]
        for relative in paths:
            with self.subTest(relative=relative):
                html = (ROOT / relative).read_text(encoding="utf-8")
                self.assertIn('href="/manifest.webmanifest"', html)
                self.assertIn('href="/walid-ai-approved-flower.png"', html)
                self.assertIn('src="/pwa.js"', html)
        home = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('src="/walid-ai-approved-logo.png"', home)
        self.assertIn('class="legal-footer"', home)
        self.assertIn('id="pwa-install"', home)

    def test_offline_only_navigation_does_not_cache_api_or_ads(self):
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("event.request.mode !== 'navigate'", sw)
        self.assertIn("fetch(event.request)", sw)
        self.assertIn("cache.add(OFFLINE_PAGE)", sw)
        self.assertNotIn("cache.put(event.request", sw)
        offline = (ROOT / "pwa-offline.html").read_text(encoding="utf-8")
        self.assertIn('content="noindex, nofollow"', offline)


if __name__ == "__main__":
    unittest.main()
