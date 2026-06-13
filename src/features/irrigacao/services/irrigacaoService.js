// src/features/irrigacao/services/irrigacaoService.js
import { logger } from '../../../shared/utils/logger.js';
import { HortaError, ERROR_CODES } from '../../../shared/utils/errors.js';

const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;
const USE_MOCK  = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';

// Module-level mock state — persists across renders/navigation
const _bombaState = {};

export const getBombaStatus = (canteiroId) => !!_bombaState[canteiroId];

export const toggleBomba = async (canteiroId, ativar) => {
  logger.info('irrigacaoService', 'toggle_bomba', { canteiroId, ativar });

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 600)); // simulate latency
    _bombaState[canteiroId] = ativar;
    logger.info('irrigacaoService', 'bomba_toggled_mock', { canteiroId, ativar });
    return { canteiro_id: canteiroId, status_bomba: ativar, irrigacao_manual: ativar };
  }

  try {
    const res = await fetch(`${BASE_URL}/canteiros/${canteiroId}/bomba`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: ativar }),
    });

    if (res.status === 404) {
      logger.warn('irrigacaoService', 'endpoint_not_found_fallback_mock', {
        note: 'Endpoint /bomba ausente — controlando localmente.',
      });
      _bombaState[canteiroId] = ativar;
      return { canteiro_id: canteiroId, status_bomba: ativar, irrigacao_manual: ativar };
    }

    if (!res.ok) {
      throw new HortaError('HSM-IRR-001', `HTTP ${res.status} ao acionar bomba.`);
    }

    const data = await res.json();
    _bombaState[canteiroId] = ativar;
    return data;
  } catch (err) {
    if (err instanceof HortaError) throw err;
    throw new HortaError('HSM-IRR-001', err.message);
  }
};

// Sync from telemetry reading so mock state matches real API state
export const syncBombaFromTelemetry = (canteiroId, statusBomba) => {
  if (_bombaState[canteiroId] === undefined) {
    _bombaState[canteiroId] = !!statusBomba;
  }
};
