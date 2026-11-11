# Walid AI staff monitoring

The free-first monitor runs read-only HTTP and security-header checks every six hours in
GitHub Actions. It requires no paid API. Set the repository variable `WALID_MONITOR_URL`
to override the default target. Firestore is optional: provide `FIREBASE_PROJECT_ID` and
the `FIREBASE_SERVICE_ACCOUNT_JSON` secret to persist audit events remotely. If unavailable,
the bounded local JSON store is used. On ephemeral GitHub runners that fallback is useful
for the current run only; it is not a cross-run alert history.

Alerts are fingerprinted and suppressed for six hours by default (`WALID_ALERT_DEDUP_SECONDS`).
The workflow has read-only contents permission and does not send mail, modify source, merge,
deploy, or create a pull request. GitHub scheduled jobs may be delayed or disabled during
repository inactivity; use `workflow_dispatch` or an external free scheduler when needed.

The CSE Engineer path remains approval-gated. Proposals are restricted to `codex/` or
`feature/` branches. An explicit admin approval may run existing tests in a temporary copy;
no source patch, push, merge, deployment, or paid service is performed automatically.
