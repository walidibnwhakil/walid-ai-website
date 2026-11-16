# Walid AI Education completion record

This checklist is the working record for completing the Education system. Keep it current across sessions. The release is complete only when every acceptance item below is verified on the live site.

## Baseline verified on 2026-11-16

- Repository `main` was at `29fda9d453d875dc7d46f45acd397af4c08011fa` when reviewed.
- `sections/education/index.html` contains 248 authored MCQs: 35–36 per grade, with seven listed subjects overall. Questions have no chapter, set, source, or review metadata.
- `quiz-variants.js` pads selections with generated arithmetic/algebra/calculus items. It has 5 repeating question forms per grade family and changes numeric operands; it is not 33,000 curriculum-authored, multi-subject MCQs.
- The page embeds its data in one HTML file. It has grade and subject filters, but no stream, chapter, or set selection. It has no lazy-loaded subject/chapter/set shards.
- The page declares 63 notes (nine per grade). A number use repeated generic explanation/steps/practice text; this does not meet the requested chapter-by-chapter notes standard.
- `publish-pages.yml` deploys the repository root to GitHub Pages on pushes to `main` and manual dispatch.
- No education-specific automated release gate was present.
- NCTB's official 2026 secondary and higher-secondary textbook list is available at <https://nctb.gov.bd/pages/static-pages/695b98afc4774958d7b7044c>. The list includes the relevant grade-level book catalogs; individual items need to be mapped to the applicable subject and chapter before questions are approved.

## Work in progress

- [x] Add a strict bank audit utility for schema, grade/set totals, answer options, Bengali explanations, source URLs, approval status, exact duplicates, and repeated numeric-template detection.
- [x] Add unit tests for the validator's schema and near-duplicate checks.
- [ ] Import and index the actual 2026 NCTB books and establish grade/stream/subject/chapter source maps.
- [ ] Replace the arithmetic padding generator with source-backed, review-approved question shards.
- [ ] Reach the required 60 complete sets per grade (50 questions in grades 6–8, 100 in grades 9–12), including the applicable secondary streams and subjects.
- [ ] Complete subject-matter review and record reviewer/date/source for every published item.
- [ ] Write chapter-specific Bengali notes, examples, worked steps, memory aids, common mistakes, exercises, and explained answers.
- [ ] Add grade → stream → subject → chapter → set navigation and lazy-load only the selected shard.
- [ ] Add end-to-end desktop and mobile browser checks for the full student flow and load performance.
- [ ] Merge only after all gates pass; then verify the deployed GitHub Pages URL and the live Education page.

## Release rules

- An item is not public until it has a chapter, a verifiable source URL, and `review_status: "approved"` after subject review.
- Generated numeric variants do not count toward the 33,000 target unless each distinct learning objective has a separately reviewed, syllabus-mapped question. The current generator does not qualify.
- Never report automated schema checks as proof of subject accuracy.
- Do not deploy while the full bank, review workflow, mobile/desktop checks, or required navigation is incomplete.
