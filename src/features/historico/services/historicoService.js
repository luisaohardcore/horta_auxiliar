// src/features/historico/services/historicoService.js
import { ALL_TELEMETRY } from '../../telemetry/mocks/telemetry.mock.js';
import { logger } from '../../../shared/utils/logger.js';
import { HortaError, ERROR_CODES } from '../../../shared/utils/errors.js';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';
const PAGE_SIZE = 20;

export const fetchHistorico = async ({ canteiroId, page = 0, limit = PAGE_SIZE, days = 7 } = {}) => {
  logger.info('historicoService', 'fetch_historico', { canteiroId, page, days });
  try {
    if (USE_MOCK) {
      const cutoff = new Date(Date.now() - days * 86_400_000);
      let data = ALL_TELEMETRY
        .filter(d => new Date(d.timestamp) >= cutoff)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (canteiroId && canteiroId !== 'todos')
        data = data.filter(d => d.canteiro_id === canteiroId);
      const total = data.length;
      return { items: data.slice(page * limit, (page + 1) * limit), total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    const params = new URLSearchParams({ page, limit, days });
    if (canteiroId && canteiroId !== 'todos') params.set('canteiro', canteiroId);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/historico?${params}`);
    if (res.status === 404) {
      logger.warn('historicoService', 'endpoint_not_found_fallback_mock', {
        code: ERROR_CODES.HST_FETCH,
        note: 'Endpoint /historico ausente na API — usando dados mock.',
      });
      // fallback: reuse mock path
      const cutoff = new Date(Date.now() - days * 86_400_000);
      let data = ALL_TELEMETRY
        .filter(d => new Date(d.timestamp) >= cutoff)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (canteiroId && canteiroId !== 'todos') data = data.filter(d => d.canteiro_id === canteiroId);
      const total = data.length;
      return { items: data.slice(page * limit, (page + 1) * limit), total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    if (!res.ok) throw new HortaError(ERROR_CODES.HST_FETCH, `HTTP ${res.status} ao buscar histórico.`);
    return res.json();
  } catch (err) {
    if (err instanceof HortaError) throw err;
    throw new HortaError(ERROR_CODES.HST_FETCH, err.message);
  }
};

export const exportHistoricoCSV = async ({ canteiroId, days = 7 } = {}) => {
  try {
    const { items } = await fetchHistorico({ canteiroId, page: 0, limit: 9999, days });
    const headers = [
      'timestamp','canteiro_id','temperatura','temperatura_solo',
      'umidade','umidade_solo','luminosidade','PH_solo',
      'status_bomba','irrigacao_manual','status',
    ];
    const rows = items.map(d =>
      headers.map(h => (d[h] === null || d[h] === undefined ? '' : d[h])).join(',')
    );
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `historico-horta-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logger.info('historicoService', 'export_csv', { rows: rows.length });
  } catch (err) {
    if (err instanceof HortaError) throw err;
    throw new HortaError(ERROR_CODES.HST_EXPORT, err.message);
  }
};
