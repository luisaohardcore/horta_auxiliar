// src/features/alertas/services/alertasService.js
import { ALERTAS_MOCK } from '../mocks/alertas.mock.js';
import { logger } from '../../../shared/utils/logger.js';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';
let _mockStore = [...ALERTAS_MOCK]; // mutable in-memory store for mock

export const fetchAlertas = async ({ canteiroId, tipo, severidade, period, page = 0, limit = 20 } = {}) => {
  logger.info('alertasService', 'fetch_alertas', { canteiroId, tipo, severidade, period, page });

  if (USE_MOCK) {
    let data = [..._mockStore].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (canteiroId && canteiroId !== 'todos') data = data.filter(a => a.canteiro_id === canteiroId);
    if (tipo      && tipo      !== 'todos') data = data.filter(a => a.tipo       === tipo);
    if (severidade && severidade !== 'todos') data = data.filter(a => a.severidade === severidade);

    if (period) {
      const cutoff = new Date(Date.now() - period * 86_400_000);
      data = data.filter(a => new Date(a.timestamp) >= cutoff);
    }

    const total = data.length;
    const items = data.slice(page * limit, (page + 1) * limit);
    return { items, total, page, limit };
  }

  const params = new URLSearchParams({ page, limit });
  if (canteiroId && canteiroId !== 'todos') params.set('canteiro', canteiroId);
  if (tipo       && tipo       !== 'todos') params.set('tipo', tipo);
  if (severidade && severidade !== 'todos') params.set('severidade', severidade);
  if (period) params.set('days', period);

  const BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1`;
  const res = await fetch(`${BASE_URL}/alertas?${params}`);
  if (!res.ok) throw new Error('Falha ao buscar alertas.');
  return res.json();
};

export const markAlertaLido = async (id) => {
  logger.info('alertasService', 'mark_lido', { id });
  if (USE_MOCK) {
    _mockStore = _mockStore.map(a => a.id === id ? { ...a, lido: true } : a);
    return { success: true };
  }
  const BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1`;
  const res = await fetch(`${BASE_URL}/alertas/${id}/lido`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Falha ao marcar alerta como lido.');
  return res.json();
};

export const countUnreadAlertas = async () => {
  if (USE_MOCK) return _mockStore.filter(a => !a.lido).length;
  const { total } = await fetchAlertas({ limit: 1 });
  return total;
};
