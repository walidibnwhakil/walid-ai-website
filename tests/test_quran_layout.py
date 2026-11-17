from pathlib import Path

ROOT = Path(__file__).parents[1] / 'islam' / 'quran'

def test_fatiha_header_and_meaning_semantics():
    reader = (ROOT / 'reader.js').read_text(encoding='utf-8')
    assert 'সূরা ${bnNames[n]||meta.transliteration}' in reader
    assert "n===1?'ভূমিকা':meta.meaning" in reader
    assert 'নামের অর্থ: সূচনা / উদ্বোধন' in reader
    assert 'অর্থ: সূচনাকারী / উদ্বোধন' not in reader

def test_standalone_basmala_has_no_explanatory_label():
    reader = (ROOT / 'reader.js').read_text(encoding='utf-8')
    css = (ROOT / 'quran.css').read_text(encoding='utf-8')
    assert 'আয়াত নম্বরের বাইরে বিসমিল্লাহ' not in reader
    assert 'basmala-label' in reader
    assert '.basmala .arabic' in css

def test_notes_remain_in_normal_flow():
    css = (ROOT / 'quran.css').read_text(encoding='utf-8')
    assert '.ayah .ayah-note{position:static!important' in css
    assert 'overflow:visible!important' in css
    assert 'clip-path:none!important' in css
