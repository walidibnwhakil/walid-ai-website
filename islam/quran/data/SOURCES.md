# Quran data sources and reuse notices

## Arabic text

The verse text is reproduced verbatim from the QPC Hafs (King Fahd Complex for Printing the Holy Quran) text dump published by Quranpedia.net, mushaf 2, dump version 2026-09-30. Source: <https://api.quranpedia.net/dumps/mushafs-2.json.gz>. The source describes it as the Hafs narration in Uthmani script from the King Fahd Complex, and notes that its digital text does not match the printed copy exactly. The publisher permits use in apps and websites; redistribution of the database requires source credit, a link, and the dump version. See <https://api.quranpedia.net/dumps/LICENSE.md>. Text values are kept verbatim.

The source snapshot was obtained from `risan/quran-json` (version 4.0.0, CC BY-SA 4.0), which documents and checks the upstream source licence. The extracted text values remain governed by the source-specific terms above. See <https://github.com/risan/quran-json> and <https://github.com/risan/quran-json/blob/main/LICENSE.txt>.

## Bengali translation and translator notes

বাংলা অনুবাদ: ড. আবূ বকর মুহাম্মাদ যাকারিয়া (Abu Bakr Zakaria), QuranEnc.com, edition `bengali_zakaria`, version 1.1.1. Official source: <https://quranenc.com/bn/browse/bengali_zakaria/>. The original verse translation and footnote text are retained verbatim. QuranEnc’s reuse conditions require no changes to the translation, clear publisher/source credit, edition version, preservation of transcript/source information, reporting translation notes to QuranEnc, updates to later editions, and no inappropriate advertisements alongside the translation. Terms: <https://quranenc.com/en/home/api>.

## Surah metadata

Arabic names, transliteration, English meaning, revelation place and ayah counts are from the Tanzil Quran metadata file <https://tanzil.net/res/text/metadata/quran-data.xml>. Metadata is presented with source attribution. Quran text license: Tanzil Project, CC BY 3.0; text copies must remain verbatim, cite Tanzil, link to <https://tanzil.net>, and include its notice. See <https://tanzil.net/docs/text_license>.

## Content display

The Islamic section does not place advertisements beside the Quran text. Bengali pronunciation is pending a properly licensed and reviewed source; none is generated automatically. Hadith text is not included in this release.

The structured files in this folder were prepared from `risan/quran-json` commit `6523a9ad3b73bb7e8cb3a9cdf0ea774b8bab3123` (version 4.0.0). Its CC BY-SA 4.0 notice is included as `QURAN-JSON-LICENSE.txt`; per-source notices and restrictions above remain in force. `provenance.json` records original-source hashes and checksums for each local surah and note file.
