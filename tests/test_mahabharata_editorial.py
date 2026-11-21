"""Book-scoped Mahabharata chronology, completeness and reader-shell regression."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "others/folklore/mahabharata/index.html"
CSS = ROOT / "others/assets/books.css"
text = BOOK.read_text(encoding="utf-8")

chapters = re.findall(
    r'<section class="others-chapter" id="chapter-(\d+)"><h2>([^<]+)</h2>(.*?)</section>',
    text, re.S,
)
toc = re.findall(r'<a href="#chapter-(\d+)">([^<]+)</a>', text)
assert len(chapters) == len(toc) == 44, "Must retain all 44 chapters and TOC links"
assert [int(n) for n, _, _ in chapters] == list(range(1, 45))
assert [(n, title) for n, title, _ in chapters] == toc, "TOC must match chapter order and names"

parvas = [
    ("আদিপর্ব", 1, 14), ("সভাপর্ব", 15, 17),
    ("বনপর্ব", 18, 20), ("বিরাটপর্ব", 21, 21),
    ("উদ্যোগপর্ব", 22, 24), ("ভীষ্মপর্ব", 25, 26),
    ("দ্রোণপর্ব", 27, 30), ("কর্ণপর্ব", 31, 32),
    ("শল্যপর্ব", 33, 33), ("সৌপ্তিকপর্ব", 34, 34),
    ("স্ত্রীপর্ব", 35, 35), ("শান্তিপর্ব", 36, 37),
    ("অনুশাসনপর্ব", 38, 38), ("অশ্বমেধিকপর্ব", 39, 39),
    ("আশ্রমবাসিকপর্ব", 40, 40), ("মৌসলপর্ব", 41, 41),
    ("মহাপ্রস্থানিকপর্ব", 42, 42), ("স্বর্গারোহণিকপর্ব", 43, 44),
]
assert len(parvas) == 18
for parva, start, end in parvas:
    for idx in range(start - 1, end):
        assert chapters[idx][1].startswith(parva + ":"), (idx + 1, parva)
for n, title, body in chapters:
    paras = re.findall(r"<p>(.*?)</p>", body, re.S)
    assert len(paras) >= 6, f"Chapter {n} is too compressed: {len(paras)} paragraphs"
    assert all(len(re.sub("<[^>]+>", "", p).strip()) >= 100 for p in paras), (
        f"Chapter {n} has an editorially thin paragraph"
    )
    assert not re.search(r"<(?:h1|h2|section|article|footer)", body), "Nested book wrapper"

parts = {int(n): body for n, _, body in chapters}
def has(chapter, *needles):
    assert all(word in parts[chapter] for word in needles), (chapter, needles)

has(5, "কুন্তী", "অধিরথ", "রাধা")
has(9, "কর্ণ", "অঙ্গরাজ্য")
has(12, "দ্রৌপদী", "পুত্র")
has(14, "সুভদ্রা", "অভিমন্যু", "খাণ্ডব")
has(15, "ময়", "রাজসূয়", "জরাসন্ধ")
has(17, "দ্রৌপদী", "পাশা", "সভা")
has(19, "নল", "দময়ন্তী", "সাবিত্রী")
has(20, "যক্ষ", "নকুল")
has(21, "কীচক", "উত্তরা", "অভিমন্যু")
has(23, "কুন্তী", "কৃষ্ণ", "কর্ণ")
has(28, "অভিমন্যু", "চক্রব্যূহ", "জয়দ্রথ", "উত্তরা")
has(29, "জয়দ্রথ", "ঘটোৎকচ")
has(32, "কর্ণ", "অর্জুন", "বৃষসেন")
has(34, "অশ্বত্থামা", "দ্রৌপদী", "উত্তরা")
has(35, "কর্ণ", "গান্ধারী", "কুন্তী")
has(39, "পরীক্ষিত", "বভ্রুবাহন", "উলূপী")
has(42, "দ্রৌপদী", "পরীক্ষিত")
has(43, "যুধিষ্ঠির", "দুর্যোধন")
has(44, "কর্ণ", "দ্রৌপদী", "জনমেজয়")

assert "নিহত" not in parts[5] and "যুদ্ধে শেষ" not in parts[5], "Karna ending disclosed during childhood"
assert "পাঁচ সন্তানের মৃত্যু" not in parts[12] and "পুত্রদের মৃত্যু" not in parts[12], "Draupadi ending disclosed during marriage"
assert "পরীক্ষিত" not in parts[28], "Parikshit postwar arc disclosed during Abhimanyu's battle"
assert "প্রথম দশ দিন" not in parts[35], "Redundant war recap appended after the war"
for banned in ("উৎস ও পরবর্তী পাঠ", "এই অধ্যায়ে", "এই অধ্যায়ে",
               "এখানে বলা হয়নি", "এখানে আনা হয়নি",
               'class="others-sources"', 'class="others-next"'):
    assert banned not in text, f"Obsolete block/meta-text: {banned}"

assert text.count('class="legal-footer"') == 1, "Footer changed or duplicated"
assert '<link rel="canonical" href="https://walid-ai.com/others/folklore/mahabharata/">' in text
for marker in (
    "/walid-ai-approved-logo.png", "/others/assets/books.css",
    "/others/assets/reader.js", 'class="others-toc-trigger"',
    'class="others-toc-dialog"', 'lang="bn"',
):
    assert marker in text, f"Book reader lost {marker}"
css = CSS.read_text(encoding="utf-8")
assert "SolaimanLipi" in css and "walid-ai-approved-flower.png" in css
assert "others-flower-spin 10s" in css

# A nominal "chapter" must not be just a short plot synopsis.  This book
# deliberately keeps the original 44 anchors, but requires substantive prose.
paragraphs = [re.sub(r"<[^>]+>", "", p).strip()
              for _, _, body in chapters for p in re.findall(r"<p>(.*?)</p>", body, re.S)]
assert len(paragraphs) >= 700, f"Only {len(paragraphs)} paragraphs: narrative was compressed"
assert len(set(paragraphs)) == len(paragraphs), "Duplicated paragraphs in book"
word_total = 0
for n, _, body in chapters:
    clean = re.sub(r"<[^>]+>", " ", body)
    words = len(clean.split())
    word_total += words
    assert words >= 550, f"Chapter {n} has only {words} words; restore its narrative"
    # Chapter 16 deliberately consolidates redundant dice-game setup and preserves the full sequence.
    min_paragraphs = 12 if int(n) == 16 else 14
    assert len(re.findall(r"<p>", body)) >= min_paragraphs, f"Chapter {n} lacks scene development"
assert word_total >= 30000, f"Book regressed to {word_total} words"

# Distinct character arcs unfold in the appropriate parva and life phase.
has(1, "জনমেজয়", "আস্তীক", "যযাতি", "ভরত")
has(2, "দেবব্রত", "গঙ্গা", "বসু", "শিক্ষা")
has(3, "সত্যবতী", "অম্বা", "পরশুরাম", "ইচ্ছামৃত্যু")
has(8, "দ্রোণ", "অশ্বত্থামা", "একলব্য", "দ্রুপদ")
has(10, "লাক্ষা", "হিড়িম্বা", "ঘটোৎকচ", "বকাসুর")
has(16, "শকুনি", "যুধিষ্ঠির", "পাশা")
# The wager chronology matters more than padding the chapter with repeated recaps.
dice_sequence = [
    "রাজসূয় যজ্ঞের পর", "বিদুর বিপদের আশঙ্কা",
    "হস্তিনাপুরের বিশাল সভায়", "সম্পদের পরে যুধিষ্ঠির ভাইদের",
    "শেষে যুধিষ্ঠির নিজেকেও হারান", "এরপর দ্রৌপদীকে পণ",
]
assert all(token in parts[16] for token in dice_sequence), "Dice-game steps were lost"
assert [parts[16].index(token) for token in dice_sequence] == sorted(
    parts[16].index(token) for token in dice_sequence
), "Dice-game steps are out of order"
has(18, "অক্ষয়পাত্র", "জয়দ্রথ", "অর্জুন")
has(22, "বিদুর", "কৃষ্ণ", "শান্তি")
has(25, "গীতা", "বিশ্বরূপ", "অর্জুন")
has(26, "দশম", "শিখণ্ডী", "শরশয্যা")
has(27, "একাদশ", "ভগদত্ত", "দ্রোণ")
has(28, "ত্রয়োদশ", "অভিমন্যু", "জয়দ্রথ")
has(29, "চতুর্দশ", "জয়দ্রথ", "ঘটোৎকচ")
has(30, "পঞ্চদশ", "দ্রোণ", "ধৃষ্টদ্যুম্ন")
has(31, "ষোড়শ", "কর্ণ", "শল্য")
has(32, "সপ্তদশ", "বৃষসেন", "দুঃশাসন")
has(33, "অষ্টাদশ", "শকুনি", "দুর্যোধন")
has(34, "নিশি", "অশ্বত্থামা", "পুত্র")
has(36, "রাজধর্ম", "ভীষ্ম", "প্রজা")
has(38, "উত্তরায়ণ", "ভীষ্ম", "গঙ্গা")
has(39, "পরীক্ষিত", "উত্তরা", "বভ্রুবাহন")
has(40, "কুন্তী", "গান্ধারী", "ধৃতরাষ্ট্র", "বিদুর")
has(41, "কৃষ্ণ", "বলরাম", "সাত্যকি", "কৃতবর্মা")
has(42, "যুধিষ্ঠির", "কুকুর", "দ্রৌপদী")
has(43, "যুধিষ্ঠির", "দুর্যোধন", "স্বর্গ")
has(44, "জনমেজয়", "কর্ণ", "দ্রৌপদী")

assert "দ্রৌপদীর মৃত্যুর" not in parts[12], "Her ending was revealed before the life arc"
assert "পরীক্ষিতের জন্ম" not in parts[28], "The birth belongs to the postwar parva"


# Editorial guardrails: a high paragraph count cannot disguise recycled scenes.
bhishma_paras = re.findall(r"<p>(.*?)</p>", parts[26], re.S)
assert len(bhishma_paras) >= 20, "First ten days should not collapse into a synopsis"
first_day_losses = [
    p for p in bhishma_paras if "উত্তর" in p and "শ্বেত" in p
]
assert len(first_day_losses) == 1, "Uttara and Shveta must have one distinct first-day scene"
assert "শল্য" in first_day_losses[0] and "ভীষ্ম" in first_day_losses[0], (
    "Uttara and Shveta must not be assigned the same killer"
)
timeline = [
    "প্রথম দিনের ভোরে", "দ্বিতীয় দিনে", "তৃতীয় দিনের",
    "চতুর্থ দিনে", "পঞ্চম দিনে", "ষষ্ঠ দিনের", "সপ্তম দিনে",
    "অষ্টম দিনের", "নবম দিনের", "দশম দিনের",
]
positions = [parts[26].find(day) for day in timeline]
assert all(p >= 0 for p in positions), "Bhishma's ten days need scene anchors"
assert positions == sorted(positions) and len(set(positions)) == 10, (
    "Bhishma war chronology must remain sequential"
)
for name in ("ইরাবান", "আলম্বুষ", "ঘটোৎকচ", "শিখণ্ডী",
             "অম্বা", "গঙ্গা", "কর্ণ", "উত্তরায়ণ"):
    assert name in parts[26], "Missing Bhishma episode: " + name

assert "সুলভা" in parts[37] and "তুলাধার" in parts[37], (
    "Shanti parva exemplars were replaced with abstract recap"
)
assert "গঙ্গা" in parts[38] and "উত্তরায়ণ" in parts[38]
assert "আস্তীক" in parts[44] and "জনমেজয়" in parts[44]
assert "উৎস ও পরবর্তী পাঠ" not in text

# Reject adjacent recaps, including paraphrases, not just exact-copy paragraphs.
COMMON = set("""এবং তাঁর তাদের তিনি থেকে সঙ্গে করে করেন হয়ে হয় হতে কিন্তু
এই সেই একটি তখন পরে যে তাঁকে কথা আছে ছিল নিয়ে নিজের তাই তাঁরা মধ্যে আবার
তাঁদের সামনে জন্য এক আর কোনো তবে যুদ্ধ রাজ্য রাজা""".split())

def salient_words(p):
    clean = re.sub(r"[।,:;—!?‘’“”()]", " ", re.sub(r"<[^>]+>", "", p))
    return {w for w in clean.split() if len(w) > 3 and w not in COMMON}

for n, _, body in chapters:
    paras = [re.sub(r"\s+", " ", p).strip() for p in
             re.findall(r"<p>(.*?)</p>", body, re.S)]
    for idx, (left, right) in enumerate(zip(paras, paras[1:]), 1):
        assert left != right, f"Duplicate consecutive paragraphs in chapter {n}"
        a, b = salient_words(left), salient_words(right)
        if min(len(a), len(b)) >= 12:
            overlap = len(a & b) / min(len(a), len(b))
            assert overlap < 0.45, (
                f"Potential paraphrased repeated scene in chapter {n}, "
                f"paragraphs {idx}/{idx+1}: {overlap:.2f}"
            )

print(f"PASS: {len(chapters)} chapters, {sum(len(re.findall(r'<p>', body)) for _, _, body in chapters)} paragraphs, 18 parvas, {word_total} words, matched TOC and preserved reader shell")
