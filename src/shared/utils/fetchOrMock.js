// src/shared/utils/fetchOrMock.js
/**
 * Tenta o endpoint real. Se receber 404, cai no mock com aviso.
 * Outros erros (500, timeout, CORS) propagam normalmente.
 *
 * @param {string}   url        - Endpoint real a chamar
 * @param {Function} mockFn     - Função síncrona ou assíncrona que retorna os dados mock
 * @param {object}   opts       - { errorCode, component } para o log
 * @returns {Promise<any>}
 */
import { logger } from './logger.js';

export async function fetchOrMock(url, mockFn, { errorCode = '', component = 'fetchOrMock' } = {}) {
  try {
    const res = await fetch(url);

    if (res.status === 404) {
      logger.warn(component, 'endpoint_not_found_fallback_mock', {
        url,
        errorCode,
        note: 'Endpoint ausente na API — usando dados mock.',
      });
      return await mockFn();
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    // Network / CORS errors — re-throw so the caller handles them
    throw err;
  }
}
