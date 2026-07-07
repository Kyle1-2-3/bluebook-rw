# Cross-device access + record sync — Design

2026-07-07

## Goal

Make the SAT R&W practice app reachable from any device, with practice records
(sessions, seen questions) shared across all of them. Single user, multiple devices.

## Approach

One Cloudflare Worker does both jobs:

- Serves `index.html` at `/` (same deploy pattern as lck-global-schedule).
- `POST /api/sync` — merges the client's records with the server copy in KV and
  returns the merged result. Guarded by a sync key (`SYNC_KEY` worker secret);
  wrong key → 401.

The College Board QBank API allows CORS from any origin (`access-control-allow-origin: *`,
verified 2026-07-07), so the browser keeps fetching questions directly as it does today.

## Data model

Server state (KV key `state`, namespace binding `STATE`):

```json
{ "sessions": [ ...same objects as localStorage bbrw_v1_sessions... ],
  "deleted":  [ "session ids the user deleted" ] }
```

`seen` is NOT synced — the app already derives it from sessions (`syncSeen()`),
so merging sessions is sufficient.

## Merge rules (server-side, in `sync.js`, unit-tested)

- Sessions: union by `id`. On conflict, a completed session beats an in-progress
  one; otherwise the later `date` wins.
- `deleted`: union of both lists; any session whose id is in `deleted` is dropped.
  This stops deleted sessions resurrecting from another device.

Protocol: client POSTs its full local state, server merges with KV, writes back,
returns merged state; client replaces its localStorage with the response.
Last-write-wins races between two simultaneous devices are acceptable (single user;
next sync repairs).

## Client changes (`index.html`)

- `SYNC_URL` is absolute, so the local `file://` copy syncs too.
- Sync key: stored in `localStorage` (`bbrw_v1_key`). If missing, `prompt()` once
  on load; cancel = sync skipped this visit, asked again next load. 401 clears the
  stored key and re-prompts next load.
- `bbrw_v1_deleted` list added; delete button records the id there.
- Sync runs: on home load, after submit, after exit-save, after delete.
  Failures are silent (offline keeps working on localStorage alone).

## Deploy

- `wrangler.toml` with account id + KV binding; `index.html` imported into the
  worker as text (wrangler `Text` rule) so the repo layout stays unchanged.
- Local: `npx wrangler deploy`. Auto-deploy: GitHub Actions on push to main
  (same workflow as LCK repo; needs `CLOUDFLARE_API_TOKEN` repo secret).
- URL: `https://bluebook-rw.bridge11korea.workers.dev`

## Verification

1. `node test.js` — merge unit tests.
2. curl `/api/sync` with two divergent states → response contains both; wrong key → 401.
3. Open live URL, enter key, confirm existing history appears; second browser
   (fresh profile) shows the same history.
