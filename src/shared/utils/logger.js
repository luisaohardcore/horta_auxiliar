/**
 * logger.js — structured logging + metrics for HortaSmart dashboard
 * Logs include: level, timestamp, requestId correlation, component, message, payload
 * Metrics: error count, fetch latency, alert display count
 */

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const MIN_LEVEL = LEVELS.DEBUG;
const MAX_LOG_STORE = 200;

// In-memory log store — readable by AlertasPage
const _logs = [];

// In-memory metrics store (observable via window.__horta_metrics__ in DevTools)
const _metrics = {
  fetch_errors: 0,
  fetch_calls: 0,
  fetch_total_ms: 0,
  alerts_displayed: 0,
  render_times: {},      // { pageName: [ms, ms, ...] }
};

if (typeof window !== 'undefined') {
  window.__horta_metrics__ = _metrics;
}

let _currentRequestId = null;

export function setRequestId(id) {
  _currentRequestId = id;
}

export function generateRequestId() {
  const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  _currentRequestId = id;
  return id;
}

function _log(level, component, message, payload = {}) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const entry = {
    level,
    ts: new Date().toISOString(),
    requestId: _currentRequestId,
    component,
    message,
    ...(payload.code ? { errorCode: payload.code } : {}),
    ...payload,
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case 'ERROR': console.error(line); break;
    case 'WARN':  console.warn(line);  break;
    default:      console.log(line);
  }

  // Keep last MAX_LOG_STORE entries in memory
  _logs.push(entry);
  if (_logs.length > MAX_LOG_STORE) _logs.shift();

  return entry;
}

// ── Public API ──────────────────────────────────────────────────

export const logger = {
  debug: (component, message, payload) => _log('DEBUG', component, message, payload),
  info:  (component, message, payload) => _log('INFO',  component, message, payload),
  warn:  (component, message, payload) => _log('WARN',  component, message, payload),
  error: (component, message, payload) => _log('ERROR', component, message, payload),
};

export const getLogs = () => [..._logs].reverse(); // newest first

// ── Metrics helpers ─────────────────────────────────────────────

export const metrics = {
  recordFetch(durationMs, success) {
    _metrics.fetch_calls += 1;
    _metrics.fetch_total_ms += durationMs;
    if (!success) _metrics.fetch_errors += 1;
    _log('DEBUG', 'metrics', 'fetch_recorded', { durationMs, success });
  },

  recordAlertDisplayed(count = 1) {
    _metrics.alerts_displayed += count;
    _log('INFO', 'metrics', 'alerts_displayed', { count, total: _metrics.alerts_displayed });
  },

  recordRenderTime(page, ms) {
    if (!_metrics.render_times[page]) _metrics.render_times[page] = [];
    _metrics.render_times[page].push(ms);
    const times = _metrics.render_times[page];
    const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
    _log('INFO', 'metrics', 'render_time', { page, ms, avg_ms: parseFloat(avg) });
  },

  snapshot() {
    const avg_fetch_ms = _metrics.fetch_calls > 0
      ? (_metrics.fetch_total_ms / _metrics.fetch_calls).toFixed(1)
      : 0;
    return { ..._metrics, avg_fetch_ms: parseFloat(avg_fetch_ms) };
  },
};
