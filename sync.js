// Merge two record states:
// { sessions: [...], deleted: [session ids], vocab: [{w, date}], vocabDeleted: [{w, date}] }.
// vocabDeleted entries are dated tombstones: a word survives only if its add date is newer
// than its tombstone, so deletes propagate across devices but re-adding still works.
// Used by the worker on every /api/sync; unit-tested in test.js.

export function mergeState(a, b) {
  const A = normalize(a), B = normalize(b);
  const deleted = [...new Set([...A.deleted, ...B.deleted])];
  const del = new Set(deleted);
  const byId = new Map();
  for (const s of [...A.sessions, ...B.sessions]) {
    if (del.has(s.id)) continue;
    const prev = byId.get(s.id);
    if (!prev || wins(s, prev)) byId.set(s.id, s);
  }
  const sessions = [...byId.values()].sort((x, y) => String(x.date).localeCompare(String(y.date)));

  const tombs = new Map();
  for (const t of [...A.vocabDeleted, ...B.vocabDeleted]) {
    const k = t.w.toLowerCase();
    const prev = tombs.get(k);
    if (!prev || String(t.date) > String(prev.date)) tombs.set(k, { w: k, date: t.date });
  }
  const byWord = new Map();
  for (const v of [...A.vocab, ...B.vocab]) {
    const k = v.w.toLowerCase();
    const prev = byWord.get(k);
    if (!prev || String(v.date) > String(prev.date)) byWord.set(k, v);
  }
  for (const [k, t] of tombs) {
    const v = byWord.get(k);
    if (v && String(v.date) > String(t.date)) tombs.delete(k);
    else byWord.delete(k);
  }
  const byDate = (x, y) => String(x.date).localeCompare(String(y.date));
  const vocab = [...byWord.values()].sort(byDate);
  const vocabDeleted = [...tombs.values()].sort(byDate);

  return { sessions, deleted, vocab, vocabDeleted };
}

function normalize(s) {
  return {
    sessions: Array.isArray(s?.sessions) ? s.sessions.filter(x => x && typeof x.id === 'string') : [],
    deleted: Array.isArray(s?.deleted) ? s.deleted.filter(x => typeof x === 'string') : [],
    vocab: Array.isArray(s?.vocab) ? s.vocab.filter(x => x && typeof x.w === 'string') : [],
    vocabDeleted: Array.isArray(s?.vocabDeleted) ? s.vocabDeleted.filter(x => x && typeof x.w === 'string') : [],
  };
}

// A completed session beats an in-progress copy; otherwise the later save wins.
function wins(s, prev) {
  const sDone = !s.inProgress, pDone = !prev.inProgress;
  if (sDone !== pDone) return sDone;
  return String(s.date) > String(prev.date);
}
