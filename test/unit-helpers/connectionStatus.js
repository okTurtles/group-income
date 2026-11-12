// A status as answered by `sw/connection/status` (see `ConnectionStatus` in
// `frontend/controller/serviceworkers/connectionMonitor.js`)
export const connectionStatus = (state, overrides = {}) => ({
  at: 0,
  source: 'app',
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
