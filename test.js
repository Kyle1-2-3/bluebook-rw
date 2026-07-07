import assert from 'node:assert';
import { mergeState } from './sync.js';

const sess = (id, date, extra = {}) => ({ id, date, score: 1, total: 2, ...extra });

// empty server + client state
assert.deepStrictEqual(mergeState(null, { sessions: [], deleted: [] }), { sessions: [], deleted: [] });

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

console.log('all tests passed');
