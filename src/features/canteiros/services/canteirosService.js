// src/features/canteiros/services/canteirosService.js
import { CANTEIROS_MOCK } from '../mocks/canteiros.mock.js';
import { logger } from '../../../shared/utils/logger.js';
import { HortaError, ERROR_CODES } from '../../../shared/utils/errors.js';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';
let _store = [...CANTEIROS_MOCK];
let _nextId = 10;

export const fetchCanteiros = async () => {
  logger.info('canteirosService', 'fetch_canteiros');
  if (USE_MOCK) return [..._store];
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros`);
    if (res.status === 404) {
      logger.warn('canteirosService', 'endpoint_not_found_fallback_mock', {
        code: ERROR_CODES.CNT_FETCH,
        note: 'Endpoint /canteiros ausente na API — usando dados mock.',
      });
      return [..._store];
    }
    if (!res.ok) throw new HortaError(ERROR_CODES.CNT_FETCH, `HTTP ${res.status} ao buscar canteiros.`);
    return res.json();
  } catch (err) {
    if (err instanceof HortaError) throw err;
    throw new HortaError(ERROR_CODES.CNT_FETCH, err.message);
  }
};

export const fetchCanteiro = async (id) => {
  logger.info('canteirosService', 'fetch_canteiro', { id });
  if (USE_MOCK) {
    const c = _store.find(x => x.id === id);
    if (!c) throw new HortaError(ERROR_CODES.CNT_NOT_FOUND, `Canteiro "${id}" não encontrado.`);
    return c;
  }
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros/${id}`);
  if (!res.ok) throw new HortaError(ERROR_CODES.CNT_NOT_FOUND, `HTTP ${res.status} ao buscar canteiro.`);
  return res.json();
};

export const createCanteiro = async (payload) => {
  logger.info('canteirosService', 'create_canteiro', { nome: payload.nome });
  validate(payload);
  try {
    if (USE_MOCK) {
      const novo = { ...payload, id: `canteiro-${++_nextId}`, status: payload.status ?? 'ativo' };
      _store.push(novo);
      return novo;
    }
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 404) {
      logger.warn('canteirosService', 'create_fallback_mock', { code: ERROR_CODES.CNT_CREATE });
      const novo = { ...payload, id: `canteiro-${++_nextId}`, status: payload.status ?? 'ativo' };
      _store.push(novo);
      return novo;
    }
    if (!res.ok) throw new HortaError(ERROR_CODES.CNT_CREATE, `HTTP ${res.status} ao criar canteiro.`);
    return res.json();
  } catch (err) {
    if (err instanceof HortaError) throw err;
    throw new HortaError(ERROR_CODES.CNT_CREATE, err.message);
  }
};

export const updateCanteiro = async (id, payload) => {
  logger.info('canteirosService', 'update_canteiro', { id });
  validate(payload);
  try {
    if (USE_MOCK) {
      const idx = _store.findIndex(x => x.id === id);
      if (idx === -1) throw new HortaError(ERROR_CODES.CNT_NOT_FOUND, `Canteiro "${id}" não encontrado.`);
      _store[idx] = { ..._store[idx], ...payload };
      return _store[idx];
    }
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 404) {
      logger.warn('canteirosService', 'update_fallback_mock', { id, code: ERROR_CODES.CNT_UPDATE });
      const idx = _store.findIndex(x => x.id === id);
      if (idx === -1) throw new HortaError(ERROR_CODES.CNT_NOT_FOUND, `Canteiro "${id}" não encontrado.`);
      _store[idx] = { ..._store[idx], ...payload };
      return _store[idx];
    }
    if (!res.ok) throw new HortaError(ERROR_CODES.CNT_UPDATE, `HTTP ${res.status} ao atualizar canteiro.`);
    return res.json();
  } catch (err) {
    if (err instanceof HortaError) throw err;
    throw new HortaError(ERROR_CODES.CNT_UPDATE, err.message);
  }
};

export const deleteCanteiro = async (id) => {
  logger.info('canteirosService', 'delete_canteiro', { id });
  try {
    if (USE_MOCK) {
      _store = _store.filter(x => x.id !== id);
      return { success: true };
    }
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros/${id}`, { method: 'DELETE' });
    if (res.status === 404) {
      logger.warn('canteirosService', 'delete_fallback_mock', { id, code: ERROR_CODES.CNT_DELETE });
      _store = _store.filter(x => x.id !== id);
      return { success: true };
    }
    if (!res.ok) throw new HortaError(ERROR_CODES.CNT_DELETE, `HTTP ${res.status} ao excluir canteiro.`);
    return res.json();
  } catch (err) {
    if (err instanceof HortaError) throw err;
    throw new HortaError(ERROR_CODES.CNT_DELETE, err.message);
  }
};

function validate(p) {
  const errors = {};
  if (!p.nome?.trim())       errors.nome           = 'Nome é obrigatório.';
  if (!p.cultura?.trim())    errors.cultura        = 'Cultura é obrigatória.';
  if (!p.area_m2 || p.area_m2 <= 0) errors.area_m2 = 'Área deve ser maior que 0.';
  if (!p.data_plantio)       errors.data_plantio   = 'Data de plantio é obrigatória.';
  if (!p.umidade_critica || p.umidade_critica < 10 || p.umidade_critica > 90)
    errors.umidade_critica = 'Limiar de umidade deve estar entre 10 e 90%.';
  if (Object.keys(errors).length)
    throw { validationErrors: errors, code: ERROR_CODES.CNT_VALIDATION };
}
