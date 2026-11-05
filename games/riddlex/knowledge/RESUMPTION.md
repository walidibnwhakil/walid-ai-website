# Durable cloud resumption

The prior scratch runtime stopped. The durable input was GitHub checkpoint
`9ca410138bb22586b47ea1e0ba35009a1e8b1105`, not the later transient downloads.
The checkpoint archives 760 eligible records and 2,123 other completed QID
screening decisions, including canonical exclusions. Its historic raw cache
count was 2,880; that count and the distinct decision ledger are separate.

The branch-scoped GitHub Actions run validates the archived source, then resumes
pending acquisition before the full activation audit, independently of
ChatGPT or a local PC. It seeds exact committed statements and related labels
without refetching them, preserves the queue and completed-QID ledger, and
commits each 500-record evidence-validated source batch. Earlier rejected
records are not reacquired. Uncommitted prior downloads were unavailable.

The final activation gate tests the full candidate pool and the exact shipped
pool. Failed additions are pruned and re-audited, never counted as playable.
The existing 1,791 IDs and 15 role definitions are preserved. No new runtime
manifest is published by a source-only checkpoint. No main/merge/deploy.

The bounded job caps new raw selection at 25,000, with Bangladesh/India first,
fiction and musical instruments next, then global people when available.
100,000 genuinely playable entries remains a goal rather than a raw-import
quota. The committed report and manifests give authoritative verified counts.

Commands from `games/riddlex` (the workflow runs these automatically):

```sh
python knowledge/resume-cloud.py /path/to/cloud-cache --new-limit 25000 --batch 500 --push
python knowledge/finalize-cloud.py --phase bulk-final --push
```

`--push` refuses any branch other than `riddlex-recovery`; Git pushes are
fast-forward only. Omit it for a local reproduction. The standard runner
restores a bounded cache if present, but committed evidence and the ledger are
authoritative even without the cache. Browser checks require Playwright and a
compatible Chromium executable (`RIDDLEX_CHROME` or Playwright default).
