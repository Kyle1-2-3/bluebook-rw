import assert from 'node:assert';
import { mergeState } from './sync.js';

const sess = (id, date, extra = {}) => ({ id, date, score: 1, total: 2, ...extra });

// empty server + client state
assert.deepStrictEqual(mergeState(null, { sessions: [], deleted: [] }), { sessions: [], deleted: [], vocab: [], vocabDeleted: [] });

// first sync: server empty, client has sessions
{
  const m = mergeState(null, { sessions: [sess('a', '2026-07-01')], deleted: [] });
  assert.strictEqual(m.sessions.length, 1);
  assert.strictEqual(m.sessions[0].id, 'a');
}

// union of distinct sessions, sorted by date
{
  const m = mergeState(
    { sessions: [sess('b', '2026-07-02')], deleted: [] },
    { sessions: [sess('a', '2026-07-01')], deleted: [] },
  );
  assert.deepStrictEqual(m.sessions.map(s => s.id), ['a', 'b']);
}

// conflict: completed beats in-progress regardless of date
{
  const m = mergeState(
    { sessions: [sess('a', '2026-07-05', { inProgress: true, idx: 9 })], deleted: [] },
    { sessions: [sess('a', '2026-07-01', { score: 20 })], deleted: [] },
  );
  assert.strictEqual(m.sessions.length, 1);
  assert.strictEqual(m.sessions[0].score, 20);
  assert.ok(!m.sessions[0].inProgress);
}

// conflict: both same status → later date wins
{
  const m = mergeState(
    { sessions: [sess('a', '2026-07-01', { score: 5 })], deleted: [] },
    { sessions: [sess('a', '2026-07-03', { score: 9 })], deleted: [] },
  );
  assert.strictEqual(m.sessions[0].score, 9);
}

// deleted ids are unioned and matching sessions dropped on both sides
{
  const m = mergeState(
    { sessions: [sess('a', '2026-07-01'), sess('b', '2026-07-02')], deleted: ['c'] },
    { sessions: [sess('c', '2026-07-03')], deleted: ['a'] },
  );
  assert.deepStrictEqual(m.sessions.map(s => s.id), ['b']);
  assert.deepStrictEqual([...m.deleted].sort(), ['a', 'c']);
}

// malformed input is normalized, junk entries dropped
{
  const m = mergeState({ sessions: 'junk' }, { sessions: [null, { noId: 1 }, sess('a', '2026-07-01')], deleted: [42, 'x'] });
  assert.deepStrictEqual(m.sessions.map(s => s.id), ['a']);
  assert.deepStrictEqual(m.deleted, ['x']);
}

// ---- vocab ----
// vocab: [{w, date}]; vocabDeleted: [{w, date}] tombstones — a word survives only if its
// add date is newer than its tombstone (so deleting on one device works, and so does re-adding).
const word = (w, date) => ({ w, date });

// states without vocab fields normalize to empty arrays
{
  const m = mergeState(null, { sessions: [], deleted: [] });
  assert.deepStrictEqual(m.vocab, []);
  assert.deepStrictEqual(m.vocabDeleted, []);
}

// vocab is unioned across sides, sorted by date
{
  const m = mergeState(
    { vocab: [word('ubiquitous', '2026-07-02')] },
    { vocab: [word('lucid', '2026-07-01')] },
  );
  assert.deepStrictEqual(m.vocab.map(v => v.w), ['lucid', 'ubiquitous']);
}

// same word (case-insensitive) deduped, later date wins
{
  const m = mergeState(
    { vocab: [word('Lucid', '2026-07-01')] },
    { vocab: [word('lucid', '2026-07-03')] },
  );
  assert.strictEqual(m.vocab.length, 1);
  assert.strictEqual(m.vocab[0].date, '2026-07-03');
}

// tombstone newer than the add drops the word (case-insensitive) and is kept
{
  const m = mergeState(
    { vocab: [word('Lucid', '2026-07-01'), word('terse', '2026-07-02')], vocabDeleted: [] },
    { vocab: [], vocabDeleted: [word('lucid', '2026-07-05')] },
  );
  assert.deepStrictEqual(m.vocab.map(v => v.w), ['terse']);
  assert.deepStrictEqual(m.vocabDeleted.map(t => t.w), ['lucid']);
}

// re-adding after deletion: add newer than tombstone → word survives, tombstone dropped
{
  const m = mergeState(
    { vocab: [], vocabDeleted: [word('lucid', '2026-07-05')] },
    { vocab: [word('lucid', '2026-07-08')], vocabDeleted: [] },
  );
  assert.deepStrictEqual(m.vocab.map(v => v.w), ['lucid']);
  assert.deepStrictEqual(m.vocabDeleted, []);
}

// malformed vocab entries dropped
{
  const m = mergeState({ vocab: 'junk' }, { vocab: [null, { date: '2026-07-01' }, word('apt', '2026-07-01')], vocabDeleted: [7, 'ok', word('x', '2026-07-01')] });
  assert.deepStrictEqual(m.vocab.map(v => v.w), ['apt']);
  assert.deepStrictEqual(m.vocabDeleted.map(t => t.w), ['x']);
}

console.log('all tests passed');
