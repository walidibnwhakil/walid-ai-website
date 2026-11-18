# Quran data sources and reuse notices

## Arabic text

The verse text is reproduced verbatim from the QPC Hafs (King Fahd Complex for Printing the Holy Quran) text dump published by Quranpedia.net, mushaf 2, dump version 2026-11-16 (built 2026-11-16T03:30:57Z). Source: <https://api.quranpedia.net/dumps/mushafs-2.json.gz>. The source describes it as the Hafs narration in Uthmani script from the King Fahd Complex, and notes that its digital text does not match the printed copy exactly. The publisher permits use in apps and websites; redistribution of the database requires source credit, a link, and the dump version. The versioned upstream archive is retained at `source-snapshots/quranpedia-mushafs-2-2026-11-16.json.gz` for reproducible local checks. Quranpedia states the text is continuously corrected and requires published copies to be kept current; this project compared its 2026-09-30 snapshot against the complete 2026-11-16 official dump and applied 3,675 changed ayah strings. The delta endpoint returned a truncated 1,000-row list, so the full versioned dump—not the incomplete delta—was used for comparison. A second official delta check since 2026-11-16 returned zero ayah changes through 2026-11-17T03:36:13Z. See <https://api.quranpedia.net/dumps/LICENSE.md> (license version 2026-11-16) and <https://api.quranpedia.net/dumps/manifest.json>. Text values are kept verbatim.

The source snapshot was obtained from `risan/quran-json` (version 4.0.0, CC BY-SA 4.0), which documents and checks the upstream source licence. The extracted text values remain governed by the source-specific terms above. See <https://github.com/risan/quran-json> and <https://github.com/risan/quran-json/blob/main/LICENSE.txt>.

## Bengali translation

বাংলা অনুবাদ: মাওলানা মুহিউদ্দীন খান (Muhiuddin Khan), machine-readable edition `quran-json@3.1.2` (`dist/chapters/bn/{1..114}.json`). The source page <https://al-quran.kaizar.us/sources> declares this edition as Muhiuddin Khan, with provenance `quran-json (Risan Bagja Pradana)` and translations from <https://tanzil.net/>; declared licence: <https://creativecommons.org/licenses/by-sa/4.0/> CC BY-SA 4.0. Source files were fetched verbatim; no translation text, punctuation, or notes were invented or paraphrased. All 114 chapter files were checked: 6,236 verses total. The reader checks source counts and renders the source `translation` string unchanged. Separate attribution page: <https://walid-ai.com/islam/quran/credits/>.

## Surah metadata

Arabic names, transliteration, English meaning, revelation place and ayah counts are from the Tanzil Quran metadata file <https://tanzil.net/res/text/metadata/quran-data.xml>. Metadata is presented with source attribution. Quran text license: Tanzil Project, CC BY 3.0; text copies must remain verbatim, cite Tanzil, link to <https://tanzil.net>, and include its notice. See <https://tanzil.net/docs/text_license>.

## Content display

The Islamic section does not place advertisements beside the Quran text or Bengali translation. Bengali pronunciation is pending a properly licensed and reviewed source; none is generated automatically. The Bangladesh government Quran portal provides the public reader and its pronunciation policy, but the reviewed official materials state no explicit republication grant. Walid AI therefore links to the official source instead of copying the pronunciation: <https://quran.gov.bd/> and <https://www.quran.gov.bd/common/doc/Nitimala-Final.pdf>. No separate hadith collection or independently authored hadith claims are included. QuranEnc's licensed translator notes may quote or cite narrations; those notes are reproduced unchanged, and this site does not independently grade their authenticity.

The structured files in this folder were prepared from `risan/quran-json` commit `6523a9ad3b73bb7e8cb3a9cdf0ea774b8bab3123` (version 4.0.0). Its CC BY-SA 4.0 notice is included as `QURAN-JSON-LICENSE.txt`; per-source notices and restrictions above remain in force. `provenance.json` records original-source hashes and checksums for each local surah and note file.
