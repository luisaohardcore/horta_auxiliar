// src/features/telemetry/services/telemetryService.js
import { logger, metrics, generateRequestId } from '../../../shared/utils/logger.js';
import { HortaError, ERROR_CODES } from '../../../shared/utils/errors.js';
import {
  MOCK_CANTEIRO_A, MOCK_CANTEIRO_B, MOCK_CANTEIRO_C, ALL_TELEMETRY,
} from '../mocks/telemetry.mock.js';

const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;
const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';

const MOCK_BY_CANTEIRO = {
  'canteiro-a': MOCK_CANTEIRO_A,
  'canteiro-b': MOCK_CANTEIRO_B,
  'canteiro-c': MOCK_CANTEIRO_C,
};

async function fetchWithTimeout(url, timeoutMs = 40_000) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  const reqId = generateRequestId();
  const t0 = Date.now();
  logger.info('telemetryService', 'fetch_start', { url, requestId: reqId });
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    const ms = Date.now() - t0;
    metrics.recordFetch(ms, res.ok);
    if (!res.ok) {
      throw new HortaError(ERROR_CODES.TEL_HTTP_ERROR, `HTTP ${res.status} em ${url}`);
    }
    logger.info('telemetryService', 'fetch_ok', { url, status: res.status, ms });
    return res;
  } catch (err) {
    clearTimeout(tid);
    const ms = Date.now() - t0;
    metrics.recordFetch(ms, false);
    if (err.name === 'AbortError') {
      throw new HortaError(ERROR_CODES.TEL_TIMEOUT, 'Servidor demorou mais de 40s para responder.');
    }
    if (err instanceof HortaError) throw err;
    logger.error('telemetryService', 'fetch_error', { url, message: err.message });
    throw new HortaError(ERROR_CODES.TEL_HTTP_ERROR, err.message);
  }
}

export const fetchCurrentTelemetry = async (canteiroId = 'canteiro-a') => {
  if (USE_MOCK) {
    const data = MOCK_BY_CANTEIRO[canteiroId] ?? MOCK_CANTEIRO_A;
    return data.findLast(d => d.status !== 'offline') ?? data[data.length - 1];
  }
  const res = await fetchWithTimeout(`${BASE_URL}/telemetria/atual?canteiro=${canteiroId}`);
  return res.json().catch(() => {
    throw new HortaError(ERROR_CODES.TEL_FETCH_ATUAL, 'Resposta inválida ao buscar leitura atual.');
  });
};

export const fetchTelemetryHistory = async (canteiroId = 'canteiro-a', days = 1) => {
  if (USE_MOCK) {
    const data = MOCK_BY_CANTEIRO[canteiroId] ?? MOCK_CANTEIRO_A;
    const cutoff = new Date(Date.now() - days * 86_400_000);
    return data.filter(d => new Date(d.timestamp) >= cutoff);
  }
  const res = await fetchWithTimeout(`${BASE_URL}/telemetria/historico?canteiro=${canteiroId}&days=${days}`);
  return res.json().catch(() => {
    throw new HortaError(ERROR_CODES.TEL_FETCH_HIST, 'Resposta inválida ao buscar histórico.');
  });
};

export const fetchAllTelemetry = async (days = 7) => {
  if (USE_MOCK) {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    return ALL_TELEMETRY.filter(d => new Date(d.timestamp) >= cutoff);
  }
  const res = await fetchWithTimeout(`${BASE_URL}/telemetria?days=${days}`);
  return res.json().catch(() => {
    throw new HortaError(ERROR_CODES.TEL_FETCH_GERAL, 'Resposta inválida ao buscar telemetria.');
  });
};

export const fetchWeeklyWaterReport = async () => {
  // Uses /telemetria/historico per canteiro — works with the real API endpoints
  const CANTEIROS = ['canteiro-a', 'canteiro-b', 'canteiro-c'];
  const results = await Promise.allSettled(
    CANTEIROS.map(id => fetchTelemetryHistory(id, 7))
  );
  return results.map((result, i) => {
    const canteiro_id = CANTEIROS[i];
    if (result.status === 'rejected') {
      logger.warn('telemetryService', 'water_report_partial', {
        canteiro_id, error: result.reason?.message,
      });
      return { canteiro_id, irrigacoes: 0, total_min: 0, estimativa_litros: 0 };
    }
    const data = result.value ?? [];
    const irrigacoes = data.filter(d => d.status_bomba).length;
    return { canteiro_id, irrigacoes, total_min: irrigacoes, estimativa_litros: irrigacoes * 12 };
  });
};
