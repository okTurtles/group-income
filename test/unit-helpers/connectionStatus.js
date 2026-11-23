// A status as answered by `sw/connection/status` (see `ConnectionStatus` in
// `frontend/controller/serviceworkers/connectionMonitor.ts`).
// `connectionMonitor.test.js` checks that a real status has the same fields.
export const connectionStatus = (state, overrides = {}) => ({
  at: 0,
  source: 'chelonia',
  state,
  since: null,
  wanted: 0,
  missing: [],
  pending: [],
  oldestPendingSince: null,
  unsubscribedSince: null,
  degraded: false,
  heals: 0,
  ...overrides
})
