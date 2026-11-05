# Riddlex verified cloud milestone

Phase: bulk-final. **100,000 verified playable entries has not been achieved.**

All 1,791 baseline casebook IDs are retained. Available casebook: **2379**.
Verified correct first guesses within 60 questions: **1717**.
New admitted identities: **588**; enriched baseline identities: **133**.
15 relationship roles are separate. Unresolved legacy records are retained, not
counted as verified playable. No target identity or exact birthday clues, retry
oracle, alias padding or synthetic rows are counted as playable.

| Category | Available | Verified ideal60 | Unresolved ideal60 | Noisy correct | Noisy wrong first |
| --- | ---: | ---: | ---: | ---: | ---: |
| characters | 2184 | 1564 | 620 | 423 | 74 |
| animals | 95 | 82 | 13 | 28 | 1 |
| objects | 100 | 71 | 29 | 35 | 1 |

Structurally eligible source records: 1620; raw records present
in the current source cache: 4923. Eligibility and raw counts
are not playability counts. Historical screening decisions and exact completed
QIDs are preserved in resume-state.json, independently of raw-cache availability.

Tests: 59 passed. English/Bengali browser games: 6,
all correct; JavaScript errors: 0. Initial local screen:
40957 bytes, 557.72 ms. Browser JS heap:
14.555394172668457 MiB. These are cloud-local measurements, not Bangladesh WAN.
Category/shard bytes, cold and focused engine timings and explicitly synthetic
100k stress results are in performance-results.json. Synthetic rows are never
entities or playable counts.

Exact ideal/noisy target outcomes are in v2-final-audit.json. Noise policy:
25% unknown, 15% probable, 5% flipped, 55% definite on recorded target facts;
missing facts remain unknown. Noisy errors and unresolved games remain limitations.
Model likelihood scores are not calibrated human confidence.

The bottleneck is meaningful bilingual discriminating evidence, not obtaining
QIDs. The loader caps each category at 20k and needs another retrieval tier before
activating substantially larger sets. Current source discovery is bounded and
prioritizes Bangladesh/India, then fictional figures, objects and global people.
Animal discovery/physical traits and Bengali fiction remain under-covered.
Missing Bengali labels are tracked, never fabricated. Same-name ambiguity is
quarantined; shared aliases are not treated as extra identities or proof of sameness.

Data is Wikidata CC0 structured evidence with recorded revisions, statement
IDs/ranks/references, label revisions and retrieval timestamps. Traceable source
assertions are not independent primary-publication fact checking.

The stopped ChatGPT runtime was not active at resume. This execution resumed
GitHub checkpoint 9ca410138bb22586b47ea1e0ba35009a1e8b1105, excluding its completed
QIDs. The queue and every substantial screened batch are saved to riddlex-recovery.
No main changes, merge, deployment or paid service provisioning. The public-repo
standard GitHub runner executes independently of the user's PC or ChatGPT session.

See Git history for exact milestone commit SHAs; this report cannot embed its
own commit SHA. The runner's final commit contains this report and measured data.
