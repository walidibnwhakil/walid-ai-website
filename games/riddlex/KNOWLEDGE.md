# Riddlex offline knowledge expansion

Riddlex currently includes 171 hand-curated entries and 15 relationship roles. The bulk importer allows larger **reviewed** datasets without requiring a paid API during play. It does not download Wikidata or automatically verify facts.

## Input format

Save a UTF-8 JSON array as `reviewed.json`:

```json
[
  {"id":"example-001","name":"Example item","category":"objects","facts":{"portable":true,"electronic":false}}
]
```

Run from `games/riddlex`:

```sh
node import-knowledge.mjs reviewed.json
npm test
```

The importer writes `knowledge.generated.js`, which the casebook already imports. Only `characters`, `animals`, and `objects` are accepted. Records need at least two known boolean fact keys, unique IDs, and a name. Unknown keys are discarded, duplicate IDs rejected. Importer accepts at most 100,000 source records per run. Check rejection counts and review the generated file before committing it.

**Important:** A large number of entries does not guarantee accurate guessing. Sparse facts, duplicated signatures, or incorrect facts can make guessing worse. Add questions to `questions` for genuinely useful new facts and test the expanded dataset before deploying. Do not import private people, contacts, personal names or private relationship data. Respect source licensing and attribution requirements. Wikidata structured statements are generally CC0, but linked images and descriptions may have separate licenses.

This is an offline preparation workflow, not a live Wikidata integration. No bulk records have been imported yet.
