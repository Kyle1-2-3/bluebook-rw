# Seven improvements — 2026-07-09

Approved by Kyle over chat. All UI text stays in English.

## 1. Hide "blank" text
College Board stimulus HTML contains `<span aria-hidden="true">______</span><span class="sr-only">blank</span>`.
Our page has no `.sr-only` rule, so the word "blank" renders visibly. Fix: add the standard
visually-hidden `.sr-only` CSS rule.

## 2. Instant answer checking (toggleable)
- Create Practice card gets a "Check answers as you go" checkbox (off by default).
- Stored on the session as `instant: true`, so resume keeps the mode.
- When on: clicking an option locks that question immediately — correct option turns green,
  a wrong pick turns red, and the rationale box appears. Locked questions ignore further clicks
  and strike-outs. The navigator colors answered cells green/red live.
- When off: behavior unchanged (reveal only after Submit).

## 3. Timer pause
- A "Pause" button next to the clock's Hide button (hidden once submitted / reviewing).
- While paused the timer stops and a full overlay covers the question area (no free reading),
  with a Resume button.

## 4. Per-question time
- `qTimes[]` — seconds accumulated per question while it is on screen (not while paused).
- Live: small time readout next to the question badge.
- Review: rationale box shows "Time spent on this question".
- Saved in the session (submit and exit-save) so it syncs across devices.

## 5. Anyone can use it (per-key accounts)
- Worker: drop the `env.SYNC_KEY` equality check. Any key matching `[\w-]{4,64}` gets its own
  KV record at `state:<key>`. The old single `state` blob is abandoned; existing local data
  re-uploads to `state:1230` on first sync.
- Site: a "Sync key: •••• · Change" control in the home footer. Changing keys warns that local
  history will be replaced by the new key's server records, then clears local sessions/deleted
  and re-syncs.

## 6. Ctrl+X → dictionary
- During test/review, select text and press Ctrl+X (or Cmd+X) → the selection (trimmed,
  ≤60 chars) is added to a vocabulary list, deduped case-insensitively, with a toast.
- Home gets a "Dictionary" section: newest first, click a word to fetch and show its definition
  from api.dictionaryapi.dev (fetched on demand, not stored), ✕ deletes.
- Vocab syncs: payload becomes `{sessions, deleted, vocab, vocabDeleted}`; `mergeState` merges
  vocab by lowercased word (later date wins), unions `vocabDeleted`, drops deleted words.
  Unit-tested in test.js.

## 7. Real SAT question order
Within each domain (domain order CAS → INI → SEC → EOI already correct), sort picked questions
by real skill order, then difficulty E → M → H:
- CAS: Words in Context → Text Structure and Purpose → Cross-Text Connections
- INI: Central Ideas and Details → Command of Evidence → Inferences
- SEC: Boundaries → Form, Structure, and Sense
- EOI: Transitions → Rhetorical Synthesis
Skill names compare case-insensitively (API returns e.g. both "Cross-Text Connections" and
"Cross-text Connections").
