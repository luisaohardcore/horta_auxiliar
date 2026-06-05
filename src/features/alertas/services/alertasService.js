// src/features/alertas/services/alertasService.js
import { ALERTAS_MOCK } from '../mocks/alertas.mock.js';
import { logger } from '../../../shared/utils/logger.js';
import { HortaError, ERROR_CODES } from '../../../shared/utils/errors.js';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';
let _mockStore = [...ALERTAS_MOCK];

export const fetchAlertas = async ({ canteiroId, tipo, severidade, period, page = 0, limit = 20 } = {}) => {
  logger.info('alertasService', 'fetch_alertas', { canteiroId, tipo, severidade, period, page });
  try {
    if (USE_MOCK) {
      let data = [..._mockStore].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (canteiroId && canteiroId !== 'todos') data = data.filter(a => a.canteiro_id === canteiroId);
      if (tipo       && tipo       !== 'todos') data = data.filter(a => a.tipo       === tipo);
      if (severidade && severidade !== 'todos') data = data.filter(a => a.severidade === severidade);
      if (period) {
        const cutoff = new Date(Date.now() - period * 86_400_000);
        data = data.filter(a => new Date(a.timestamp) >= cutoff);
      }
      const total = data.length;
      return { items: data.slice(page * limit, (page + 1) * limit), total, page, limit };
    }

    const params = new URLSearchParams({ page, limit });
    if (canteiroId && canteiroId !== 'todos') params.set('canteiro', canteiroId);
    if (tipo       && tipo       !== 'todos') params.set('tipo', tipo);
    if (severidade && severidade !== 'todos') params.set('severidade', severidade);
    if (period) params.set('days', period);

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/alertas?${params}`);
    if (!res.ok) throw new HortaError(ERROR_CODES.ALR_FETCH, `HTTP ${res.status} ao buscar alertas.`);
    return res.json();
  } catch (err) {
    if (err instanceof HortaError) throw err;
    throw new HortaError(ERROR_CODES.ALR_FETCH, err.message);
  }
};

export const markAlertaLido = async (id) => {
  logger.info('alertasService', 'mark_lido', { id });
  try {
    if (USE_MOCK) {
      _mockStore = _mockStore.map(a => a.id === id ? { ...a, lido: true } : a);
      return { success: true };
    }
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/alertas/${id}/lido`, { method: 'PATCH' });
    if (!res.ok) throw new HortaError(ERROR_CODES.ALR_MARK_LIDO, `HTTP ${res.status} ao marcar alerta.`);
    return res.json();
  } catch (err) {
    if (err instanceof HortaError) throw err;
    throw new HortaError(ERROR_CODES.ALR_MARK_LIDO, err.message);
  }
};

export const countUnreadAlertas = async () => {
  if (USE_MOCK) return _mockStore.filter(a => !a.lido).length;
  const { total } = await fetchAlertas({ limit: 1 });
  return total;
};
