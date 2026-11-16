# UFCalendar MMA adapter

This draft is intentionally disabled in production. The current repository has no
UFCalendar API key, so no MMA tab is added to `data/sports.json` and no deployment
is made.

Verified on 2026-11-16:

- UFCalendar's current docs and terms state 100 requests/month for the free plan;
  accounts created before 2026-11-11 may retain 1,000.
- Bearer authentication is required for `GET /v1/events`; `GET /v1/plans` is
  the only no-key discovery endpoint.
- Commercial display in Walid AI is permitted, but raw dataset/API redistribution
  and official sportsbook data use are prohibited.
- The adapter uses a 12-hour server cache and a 2-calls/day budget (60/month),
  preserving 40 requests for corrections or fight weekends. This is not true
  live coverage; the UI must retain the existing 5-minute polling only after a
  verified backend feed exists.

Activation requires a server-side `UFCALENDAR_API_KEY`, a live authenticated
response check, and a follow-up change that wires the normalized feed into
`data/sports.json` without changing Football, Cricket, Olympics, or Commonwealth.
