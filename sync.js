// Merge two record states: { sessions: [...], deleted: [session ids] }.
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
  return { sessions, deleted };
}

function normalize(s) {
  return {
    sessions: Array.isArray(s?.sessions) ? s.sessions.filter(x => x && typeof x.id === 'string') : [],
    deleted: Array.isArray(s?.deleted) ? s.deleted.filter(x => typeof x === 'string') : [],
  };
}

// A completed session beats an in-progress copy; otherwise the later save wins.
function wins(s, prev) {
  const sDone = !s.inProgress, pDone = !prev.inProgress;
  if (sDone !== pDone) return sDone;
  return String(s.date) > String(prev.date);
}
